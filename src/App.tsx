import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Layers, 
  User as UserIcon,
  Send,
  Loader2,
  ArrowRight,
  DollarSign,
  Star,
  TrendingUp,
  Zap,
  ChevronLeft,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { User, Project, Milestone } from './types';
import { generateMilestones, verifyWork } from './services/aiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'post' | 'project'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Form states
  const [newProject, setNewProject] = useState({ title: '', description: '', budget: 0 });
  const [generatedMilestones, setGeneratedMilestones] = useState<any[]>([]);
  const [submissionText, setSubmissionText] = useState('');

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`);
    const data = await res.json();
    setUser(data);
  };

  const fetchProjects = async () => {
    const url = user 
      ? `/api/projects?userId=${user.id}&role=${user.role}&t=${Date.now()}`
      : `/api/projects?t=${Date.now()}`;
    const res = await fetch(url);
    const data = await res.json();
    setProjects(data);
  };

  const removeProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!user) {
      console.warn('Cannot remove project: No user logged in');
      return;
    }
    
    if (confirmingDelete !== projectId) {
      setConfirmingDelete(projectId);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmingDelete(null), 3000);
      return;
    }
    
    console.log(`Removing project ${projectId} for user ${user.id} (${user.role})`);
    
    try {
      const res = await fetch(`/api/projects/${projectId}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role })
      });
      
      if (res.ok) {
        console.log('Project hidden successfully');
        setConfirmingDelete(null);
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setView('dashboard');
        }
        await fetchProjects();
      } else {
        console.error('Failed to hide project', await res.text());
      }
    } catch (error) {
      console.error('Error hiding project:', error);
    }
  };

  const handlePostProject = async () => {
    setAiLoading(true);
    try {
      const milestones = await generateMilestones(newProject.description, newProject.budget);
      setGeneratedMilestones(milestones);
    } catch (error) {
      console.error(error);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmProject = async () => {
    setLoading(true);
    const projectData = {
      id: crypto.randomUUID(),
      client_id: user?.id,
      ...newProject,
      milestones: generatedMilestones.map(m => ({ ...m, id: crypto.randomUUID() }))
    };

    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    setLoading(false);
    setView('dashboard');
    fetchProjects();
    setNewProject({ title: '', description: '', budget: 0 });
    setGeneratedMilestones([]);
  };

  const viewProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setSelectedProject(data);
    setView('project');
  };

  const submitMilestone = async (milestoneId: string) => {
    setLoading(true);
    await fetch(`/api/milestones/${milestoneId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission: submissionText })
    });
    
    const milestone = selectedProject?.milestones?.find(m => m.id === milestoneId);
    if (milestone) {
      const result = await verifyWork(milestone.title, milestone.description, submissionText);
      const endpoint = result.status === 'approved' ? 'approve' : 'reject';
      
      await fetch(`/api/milestones/${milestoneId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: result.feedback })
      });
    }

    setLoading(false);
    setSubmissionText('');
    viewProject(selectedProject!.id);
  };

  const acceptProject = async (projectId: string) => {
    if (!user) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freelancer_id: user.id })
    });
    setLoading(false);
    viewProject(projectId);
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-6">
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-base text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-zinc-900 text-white px-8 py-4 rounded-full shadow-2xl border border-zinc-800 flex items-center gap-3">
            <div className="flex items-baseline">
              <span className="text-3xl font-black tracking-tighter leading-none">MID</span>
              <Zap className="w-8 h-8 text-yellow-400 mx-1 fill-yellow-400" />
              <span className="text-3xl font-black tracking-tighter leading-none">WAY</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl w-full space-y-12 text-center mt-20">
          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter text-zinc-900">
              The Future of <span className="text-yellow-600">Work</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
              Autonomous AI-driven platform for secure, automated, and trustless collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchUser('client_demo')}
              className="bg-white p-10 rounded-[3rem] shadow-xl border-2 border-transparent hover:border-yellow-400 transition-all text-left group"
            >
              <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                <Briefcase className="w-8 h-8 text-zinc-900" />
              </div>
              <h2 className="text-3xl font-black mb-2">I am an Employer</h2>
              <p className="text-slate-500">Post projects, automate milestones, and pay with AI verification.</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchUser('freelancer_demo')}
              className="bg-zinc-900 p-10 rounded-[3rem] shadow-xl border-2 border-transparent hover:border-yellow-400 transition-all text-left text-white group"
            >
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <h2 className="text-3xl font-black mb-2">I am a Freelancer</h2>
              <p className="text-zinc-400">Find work, submit proof, and get paid instantly by AI.</p>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 font-sans">
      {/* Logo Bubble - Separated from Nav */}
      <div className="fixed top-6 left-8 z-[60]">
        <div className="bg-zinc-900 text-white px-6 py-3 rounded-full shadow-xl border border-zinc-800 flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="flex items-baseline">
            <span className="text-xl font-black tracking-tighter leading-none">MID</span>
            <Zap className="w-5 h-5 text-yellow-400 mx-0.5 fill-yellow-400" />
            <span className="text-xl font-black tracking-tighter leading-none">WAY</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-20rem)] max-w-4xl z-50">
        <div className="bg-zinc-900/90 backdrop-blur-md text-white rounded-2xl border border-zinc-800 shadow-2xl px-6 py-3 flex justify-between items-center">
          {/* Center - Status */}
          <div className="flex items-center gap-8 mx-auto">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Core Active</span>
             </div>
          </div>

          {/* Right - User & Actions */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setUser(null)}
              className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
            
            <div className="flex items-center gap-3 pl-6 border-l border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">{user?.name.split(' ')[0]}</p>
                <p className="text-[9px] text-yellow-400/70 font-bold mt-1 uppercase tracking-tighter">Trust: {user?.pfi}</p>
              </div>
              <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 hover:border-yellow-400 transition-colors cursor-pointer">
                <UserIcon className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-32 pb-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Hello, {user?.name.split(' ')[0]}</h1>
                  <p className="text-slate-500 mt-2">Check your projects and see how AI is helping you work.</p>
                </div>
                {user?.role === 'client' && (
                  <button 
                    onClick={() => setView('post')}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-zinc-900 rounded-xl font-semibold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 hover:-translate-y-0.5 transition-all group relative"
                  >
                    <PlusCircle className="w-5 h-5" />
                    POP
                    <div className="relative group/info">
                      <AlertCircle className="w-4 h-4 text-zinc-900/50 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Post a Project
                      </div>
                    </div>
                  </button>
                )}
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Briefcase} label="Active Projects" value={projects.length} color="bg-zinc-200 text-zinc-900" />
                <StatCard icon={Zap} label="AI Checks Done" value="12" color="bg-yellow-400/20 text-yellow-600" />
                <StatCard icon={TrendingUp} label="Your Rating" value={user?.pfi} color="bg-zinc-200 text-zinc-900" />
                <StatCard icon={DollarSign} label="Money in Safe" value={`$${projects.reduce((acc, p) => acc + p.budget, 0)}`} color="bg-yellow-400 text-zinc-900" />
              </div>

              <section className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Recent Work</h2>
                  <button className="text-sm font-semibold text-yellow-600 hover:underline">See all</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <motion.div 
                      key={project.id}
                      whileHover={{ y: -6, scale: 1.02 }}
                      onClick={() => viewProject(project.id)}
                      className="bg-white p-8 rounded-3xl shadow-md border border-zinc-100 hover:border-yellow-400 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 flex items-center gap-3">
                        {user && (
                          <button 
                            onClick={(e) => removeProject(e, project.id)}
                            className={`p-2 transition-all flex items-center gap-2 rounded-full ${
                              confirmingDelete === project.id 
                                ? 'bg-red-600 text-white px-4' 
                                : 'bg-white/10 hover:bg-red-500/10 text-slate-400 hover:text-red-600'
                            }`}
                            title={confirmingDelete === project.id ? "Click again to confirm" : "Remove from my view"}
                          >
                            <Trash2 className="w-4 h-4" />
                            {confirmingDelete === project.id && <span className="text-[10px] font-bold uppercase">Confirm?</span>}
                          </button>
                        )}
                        <span className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-full ${
                          project.status === 'open' ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-900 text-white'
                        }`}>
                          {project.status === 'open' ? 'Looking for help' : 'In Progress'}
                        </span>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black group-hover:text-yellow-600 transition-colors">{project.title}</h3>
                          <p className="text-base text-slate-500 line-clamp-2">{project.description}</p>
                        </div>
                        <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-5 h-5 text-slate-400" />
                              <span className="text-xl font-black text-slate-700">{project.budget}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-5 h-5 text-slate-400" />
                              <span className="text-sm text-slate-500 font-bold">{new Date(project.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <ArrowRight className="w-6 h-6 text-slate-300 group-hover:text-yellow-600 group-hover:translate-x-2 transition-all" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No work yet. Start by posting a project!</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'post' && (
            <motion.div 
              key="post"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
                  <div className="bg-white p-8 rounded-3xl shadow-xl shadow-zinc-200 border border-zinc-100 space-y-8">
                    <header className="flex items-center gap-4">
                      <button onClick={() => setView('dashboard')} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <div>
                        <h2 className="text-2xl font-bold">Post a Project</h2>
                        <p className="text-sm text-slate-500">AI will help you break the project into smaller steps.</p>
                      </div>
                    </header>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Project Title</label>
                    <input 
                      type="text" 
                      value={newProject.title}
                      onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all outline-none"
                      placeholder="e.g. Help me design a website"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">What do you need done?</label>
                    <textarea 
                      rows={4}
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all outline-none"
                      placeholder="Describe the work here..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">How much will you pay? ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="number" 
                        value={newProject.budget}
                        onChange={(e) => setNewProject({...newProject, budget: Number(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all outline-none"
                      />
                    </div>
                  </div>

                  {!generatedMilestones.length ? (
                    <button 
                      onClick={handlePostProject}
                      disabled={aiLoading || !newProject.title || !newProject.description}
                      className="w-full py-4 bg-yellow-400 text-zinc-900 rounded-xl font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                      Let AI Plan the Steps
                    </button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 space-y-4">
                        <div className="flex items-center gap-2 text-yellow-600 mb-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <h3 className="font-bold text-sm uppercase tracking-wider">AI's Plan for the Work</h3>
                        </div>
                        {generatedMilestones.map((m, i) => (
                          <div key={i} className="flex justify-between items-start bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
                            <div>
                              <p className="font-bold text-slate-800">{m.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                            </div>
                            <span className="font-bold text-yellow-600">${m.amount}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setGeneratedMilestones([])}
                          className="flex-1 py-4 bg-zinc-100 text-slate-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
                        >
                          Try Again
                        </button>
                        <button 
                          onClick={confirmProject}
                          disabled={loading}
                          className="flex-1 py-4 bg-yellow-400 text-zinc-900 rounded-xl font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
                        >
                          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                          Confirm & Pay
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'project' && selectedProject && (
            <motion.div 
              key="project"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-4">
                  <button 
                    onClick={() => setView('dashboard')}
                    className="text-sm font-semibold text-slate-500 hover:text-yellow-600 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Go Back
                  </button>
                  <h2 className="text-4xl font-bold tracking-tight">{selectedProject.title}</h2>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-zinc-200 text-xs font-bold text-slate-600">
                      <DollarSign className="w-3.5 h-3.5" /> Pay: ${selectedProject.budget}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-zinc-200 text-xs font-bold text-slate-600">
                      <Clock className="w-3.5 h-3.5" /> Started: {new Date(selectedProject.created_at).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={(e) => {
                        removeProject(e, selectedProject.id);
                        setView('dashboard');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Project
                    </button>
                  </div>
                </div>
                
                <div className="bg-zinc-900 text-white p-6 rounded-3xl shadow-xl shadow-zinc-200 flex items-center gap-6">
                  <div>
                    <div className="flex items-center gap-1.5 opacity-80 mb-1 text-yellow-400">
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Money in Safe</span>
                    </div>
                    <p className="text-3xl font-bold">${selectedProject.budget}.00</p>
                  </div>
                  <div className="h-12 w-[1px] bg-white/20" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase opacity-80 mb-1">Status</p>
                    <p className="text-sm font-bold bg-yellow-400 text-zinc-900 px-3 py-1 rounded-full uppercase tracking-widest">{selectedProject.status}</p>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">About the Project</h3>
                    <p className="text-lg text-slate-700 leading-relaxed">{selectedProject.description}</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Steps & Checking</h3>
                    {selectedProject.milestones?.map((m, i) => (
                      <div key={m.id} className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
                        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center font-bold text-yellow-600 shadow-sm">
                              {i + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{m.title}</h4>
                              <p className="text-xs text-slate-500 font-medium">${m.amount} for this step</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.status === 'approved' ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/10 text-yellow-600 rounded-full text-[10px] font-bold uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5" /> AI Checked & Paid
                              </div>
                            ) : m.status === 'submitted' ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI is Checking...
                              </div>
                            ) : m.status === 'rejected' ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase">
                                <AlertCircle className="w-3.5 h-3.5" /> AI Rejected
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">
                                <Clock className="w-3.5 h-3.5" /> Waiting
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                          <p className="text-sm text-slate-600 leading-relaxed">{m.description}</p>
                          
                          {(m.status === 'pending' || m.status === 'rejected') && user?.role === 'freelancer' && (
                            <div className="space-y-4 pt-4 border-t border-zinc-100">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">
                                  {m.status === 'rejected' ? 'Try again: Send your work' : 'Send your work'}
                                </label>
                                <textarea 
                                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                                  placeholder="Tell the AI what you did or share links..."
                                  rows={3}
                                  value={submissionText}
                                  onChange={(e) => setSubmissionText(e.target.value)}
                                />
                              </div>
                              <button 
                                onClick={() => submitMilestone(m.id)}
                                disabled={loading || !submissionText}
                                className="px-8 py-3 bg-yellow-400 text-zinc-900 rounded-xl font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-all flex items-center gap-2 disabled:opacity-50"
                              >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {m.status === 'rejected' ? 'Re-submit for AI Review' : 'Send for AI Review'}
                              </button>
                            </div>
                          )}

                          {m.feedback && (
                            <div className="bg-zinc-900 rounded-2xl p-5 space-y-3">
                              <div className="flex items-center gap-2 text-yellow-400">
                                <Zap className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">AI's Comments</span>
                              </div>
                              <p className="text-sm text-zinc-300 leading-relaxed italic">"{m.feedback}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {selectedProject.status === 'open' && user?.role === 'freelancer' && (
                    <button 
                      onClick={() => acceptProject(selectedProject.id)}
                      disabled={loading}
                      className="w-full py-4 bg-zinc-900 text-white rounded-3xl font-bold shadow-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-yellow-400" />}
                      Accept This Project
                    </button>
                  )}

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Participants</h3>
                    <div className="space-y-6">
                      {/* Employer Details */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 border border-zinc-200">
                          {selectedProject.client?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employer</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProject.client?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-slate-600">{selectedProject.client?.pfi || '0.0'} Rating</span>
                          </div>
                        </div>
                      </div>

                      {/* Freelancer Details */}
                      {selectedProject.freelancer ? (
                        <div className="flex items-center gap-4 pt-4 border-t border-zinc-50">
                          <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center font-bold text-zinc-900 shadow-sm shadow-yellow-400/20">
                            {selectedProject.freelancer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freelancer</p>
                            <p className="text-sm font-bold text-slate-900">{selectedProject.freelancer.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-[10px] font-bold text-slate-600">{selectedProject.freelancer.pfi} Rating</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 pt-4 border-t border-zinc-50 opacity-50">
                          <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-zinc-300" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freelancer</p>
                            <p className="text-sm font-medium text-slate-400 italic">Waiting for someone...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Safety & Trust</h3>
                    <div className="space-y-5">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Money is Safe</p>
                          <p className="text-xs text-slate-500 mt-1">Money is held safely until the AI says the work is good.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">AI Checking</p>
                          <p className="text-xs text-slate-500 mt-1">AI checks the work automatically to make sure it's correct.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <Star className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Trust Rating</p>
                          <p className="text-xs text-slate-500 mt-1">Doing good work makes your trust score go up.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="bg-zinc-900 rounded-3xl p-6 text-white space-y-4">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Automatic System</span>
                      </div>
                      <p className="text-sm opacity-80 leading-relaxed">
                        This project is run by AI. You don't need to wait for a person to approve your work or pay you.
                      </p>
                    </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto px-8 py-12 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 opacity-40">
          <Layers className="w-5 h-5" />
          <span className="text-sm font-bold tracking-tight">MIDWAY</span>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Work with AI • Safe & Simple
        </p>
        <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <a href="#" className="hover:text-yellow-600 transition-colors">How it works</a>
          <a href="#" className="hover:text-yellow-600 transition-colors">Safety</a>
          <a href="#" className="hover:text-yellow-600 transition-colors">Help</a>
        </div>
      </footer>
    </div>
  );
}
