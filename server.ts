import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("auralance.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    pfi REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    title TEXT,
    description TEXT,
    budget REAL,
    status TEXT DEFAULT 'open',
    freelancer_id TEXT,
    hidden_for_client INTEGER DEFAULT 0,
    hidden_for_freelancer INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES users(id),
    FOREIGN KEY(freelancer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    title TEXT,
    description TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    submission TEXT,
    feedback TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS escrow (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    amount REAL,
    status TEXT DEFAULT 'held',
    FOREIGN KEY(project_id) REFERENCES projects(id)
  );
`);

// Ensure columns exist for existing databases
try {
  db.prepare("ALTER TABLE projects ADD COLUMN hidden_for_client INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE projects ADD COLUMN hidden_for_freelancer INTEGER DEFAULT 0").run();
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    const { userId, role } = req.query;
    console.log(`[GET /api/projects] userId: ${userId}, role: ${role}`);
    let projects;
    if (userId && role) {
      if (role === 'client') {
        projects = db.prepare("SELECT * FROM projects WHERE client_id = ? AND hidden_for_client = 0 ORDER BY created_at DESC").all(userId);
      } else {
        // For freelancers, show projects where they are the freelancer OR open projects they haven't hidden
        projects = db.prepare(`
          SELECT * FROM projects 
          WHERE (freelancer_id = ? AND hidden_for_freelancer = 0)
          OR (status = 'open' AND hidden_for_freelancer = 0)
          ORDER BY created_at DESC
        `).all(userId);
      }
    } else {
      projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    }
    console.log(`[GET /api/projects] Returning ${projects.length} projects`);
    res.json(projects);
  });

  app.get("/api/projects/:id", (req, res) => {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    
    const milestones = db.prepare("SELECT * FROM milestones WHERE project_id = ?").all(req.params.id);
    const client = db.prepare("SELECT id, name, role, pfi FROM users WHERE id = ?").get(project.client_id);
    const freelancer = project.freelancer_id ? db.prepare("SELECT id, name, role, pfi FROM users WHERE id = ?").get(project.freelancer_id) : null;
    
    res.json({ ...project, milestones, client, freelancer });
  });

  app.post("/api/projects/:id/accept", (req, res) => {
    const { freelancer_id } = req.body;
    db.prepare("UPDATE projects SET freelancer_id = ?, status = 'in_progress' WHERE id = ?").run(freelancer_id, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/projects", (req, res) => {
    const { id, client_id, title, description, budget, milestones } = req.body;
    
    const insertProject = db.prepare("INSERT INTO projects (id, client_id, title, description, budget) VALUES (?, ?, ?, ?, ?)");
    const insertMilestone = db.prepare("INSERT INTO milestones (id, project_id, title, description, amount) VALUES (?, ?, ?, ?, ?)");
    const insertEscrow = db.prepare("INSERT INTO escrow (id, project_id, amount) VALUES (?, ?, ?)");

    const transaction = db.transaction(() => {
      insertProject.run(id, client_id, title, description, budget);
      milestones.forEach((m: any) => {
        insertMilestone.run(m.id, id, m.title, m.description, m.amount);
      });
      insertEscrow.run(crypto.randomUUID(), id, budget);
    });

    transaction();
    res.json({ success: true });
  });

  app.post("/api/milestones/:id/submit", (req, res) => {
    const { submission } = req.body;
    db.prepare("UPDATE milestones SET submission = ?, status = 'submitted' WHERE id = ?").run(submission, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/milestones/:id/approve", (req, res) => {
    const { feedback } = req.body;
    db.prepare("UPDATE milestones SET status = 'approved', feedback = ? WHERE id = ?").run(feedback, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/milestones/:id/reject", (req, res) => {
    const { feedback } = req.body;
    db.prepare("UPDATE milestones SET status = 'rejected', feedback = ? WHERE id = ?").run(feedback, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/projects/:id/hide", (req, res) => {
    const { role } = req.body;
    console.log(`[POST /api/projects/${req.params.id}/hide] role: ${role}`);
    if (role === 'client') {
      // When an employer removes a project, it's effectively cancelled for everyone
      db.prepare("UPDATE projects SET hidden_for_client = 1, hidden_for_freelancer = 1, status = 'cancelled' WHERE id = ?").run(req.params.id);
    } else {
      // When a freelancer removes a project, it's only hidden from their own view
      db.prepare("UPDATE projects SET hidden_for_freelancer = 1 WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/users/:id", (req, res) => {
    let user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    
    // For demo purposes, ensure names are Shreyash and Kavya
    if (req.params.id === 'client_demo' || req.params.id === 'freelancer_demo') {
      const name = req.params.id === 'client_demo' ? 'Shreyash (Employer)' : 'Kavya (Freelancer)';
      const role = req.params.id === 'client_demo' ? 'client' : 'freelancer';
      
      if (!user) {
        db.prepare("INSERT INTO users (id, name, role, pfi) VALUES (?, ?, ?, ?)").run(req.params.id, name, role, 85.5);
        user = { id: req.params.id, name, role, pfi: 85.5 };
      } else if (user.name !== name) {
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.params.id);
        user.name = name;
      }
    }
    
    res.json(user);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
