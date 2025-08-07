import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  // State for user authentication and UI
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  // Filter: all | created | assigned
  const [taskFilter, setTaskFilter] = useState('all');
  // Sort‐order by due date: asc | desc
  const [taskSortOrder, setTaskSortOrder] = useState('asc');

  // State for project management
  const [projects, setProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showJoinProject, setShowJoinProject] = useState(false);
  const [projectMessage, setProjectMessage] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);

  // State for task management
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  // State for editing tasks
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('');
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('');
  const [editTaskTags, setEditTaskTags] = useState('');

  // State for viewing other users' profiles
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [viewingUserProfileData, setViewingUserProfileData] = useState(null);
     // Filter & sort tasks (must be before any return)
  const visibleTasks = tasks
    .filter(task => {
      if (taskFilter === 'all') return true;
      if (taskFilter === 'created') return task.creator_username === username;
      if (taskFilter === 'assigned') return task.assignee_username === username;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      return taskSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });


  // --- Utility Functions ---
  const handleMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleProjectMessage = (msg) => {
    setProjectMessage(msg);
    setTimeout(() => setProjectMessage(''), 5000);
  };

  // --- Authentication ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',             // ← send cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsLoggedIn(true);
        setUsername(data.username);      
        await fetchProjects();   
        handleMessage('Login successful!');
      } else {
        handleMessage(data.message);
      }
    } catch (error) {
      handleMessage('Network error during login.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',             // ← send cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.status === 201) {
        handleMessage('Registration successful! You can now log in.');
        setShowRegister(false);
      } else {
        handleMessage(data.message);
      }
    } catch (error) {
      handleMessage('Network error during registration.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        credentials: 'include'              // ← send cookies
      });
      setIsLoggedIn(false);
      setUsername('');
      setPassword('');
      setEmail('');
      setCurrentProject(null);
      setTasks([]);
      setProjects([]);
      handleMessage('Logged out successfully.');
    } catch (error) {
      handleMessage('Network error during logout.');
    }
  };

  const checkLoginStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'              // ← send cookies
      });
      const data = await response.json();
      if (data.is_authenticated) {
        setIsLoggedIn(true);
        setUsername(data.username);
        fetchProjects();
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // --- Project Management ---
  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        credentials: 'include'             // ← send cookies
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Network error fetching projects:', error);
    }
  }, []);
  // Fetch completed projects
  const fetchCompletedProjects = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/projects/completed`,
        { credentials: 'include' }
      );
      if (res.ok) {
        setCompletedProjects(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch completed projects', e);
    }
  }, []);
  useEffect(() => {
  if (isLoggedIn) {
    fetchProjects();
    fetchCompletedProjects();
  }
}, [isLoggedIn, fetchProjects, fetchCompletedProjects]);


  const fetchProjectTasksAndMembers = useCallback(async (projectId) => {
    try {
      const [tasksResponse, membersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/api/projects/${projectId}/members`, {
          credentials: 'include'
        }),
      ]);

      if (tasksResponse.ok && membersResponse.ok) {
        const tasksData = await tasksResponse.json();
        const membersData = await membersResponse.json();
        setTasks(tasksData);
        setProjectMembers(membersData);
      } else {
        console.error('Failed to fetch project data');
        handleProjectMessage('Failed to load project data. Please try again.');
      }
    } catch (error) {
      console.error('Network error fetching project data:', error);
      handleProjectMessage('Network error. Could not fetch project data.');
    }
  }, []);

  useEffect(() => {
    if (editingTask && currentProject) {
      setEditTaskAssigneeId(editingTask.assignee_id);
    }
  }, [editingTask, currentProject]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectTitle }),
      });
      const newProject = await response.json();
      if (response.ok) {
        handleProjectMessage(`Project '${newProject.title}' created successfully!`);
        setShowCreateProject(false);
        setNewProjectTitle('');
        fetchProjects();
      } else {
        handleProjectMessage(newProject.message);
      }
    } catch (error) {
      handleProjectMessage('Network error creating project.');
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: joinCode }),
      });
      const data = await response.json();
      if (response.ok) {
        handleProjectMessage(data.message);
        setShowJoinProject(false);
        setJoinCode('');
        fetchProjects();
      } else {
        handleProjectMessage(data.message);
      }
    } catch (error) {
      handleProjectMessage('Network error joining project.');
    }
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    fetchProjectTasksAndMembers(project.id);
  };
// ── Mark Project Completed ───────────────────────────────────────
const handleCompleteProject = async () => {
  if (!currentProject) return;

  // **confirmation prompt**
  const ok = window.confirm(
    `Are you sure you want to mark "${currentProject.title}" as completed?`
  );
  if (!ok) return;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/projects/${currentProject.id}/complete`,
      {
        method: 'PUT',
        credentials: 'include'
      }
    );
    if (res.ok) {
      handleProjectMessage('Project marked completed!');
      // go back to project list
      setCurrentProject(null);
      // refresh both active & completed project lists
      fetchProjects();
      fetchCompletedProjects();
    } else {
      const err = await res.json();
      handleProjectMessage(err.message || 'Failed to complete project.');
    }
  } catch (e) {
    console.error('Error completing project', e);
    handleProjectMessage('Network error.');
  }
};



  // --- Task Management ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!currentProject) return;

    try {
      const newTags = newTaskTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await fetch(`${API_BASE_URL}/api/projects/${currentProject.id}/tasks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          due_date: newTaskDueDate,
          assignee_id: newTaskAssigneeId || null,
          priority: newTaskPriority,
          tags: newTags,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        handleMessage('Task created successfully!');
        setShowAddTask(false);
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskDueDate('');
        setNewTaskAssigneeId('');
        setNewTaskPriority('medium');
        setNewTaskTags('');
        fetchProjectTasksAndMembers(currentProject.id);
      } else {
        handleMessage(data.message);
      }
    } catch (error) {
      handleMessage('Network error creating task.');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!currentProject || !editingTask) return;

    try {
      const updatedTags = editTaskTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const response = await fetch(`${API_BASE_URL}/api/projects/${currentProject.id}/tasks/${editingTask.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDescription,
          due_date: editTaskDueDate,
          status: editTaskStatus,
          assignee_id: editTaskAssigneeId || null,
          priority: editTaskPriority,
          tags: updatedTags,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        handleMessage('Task updated successfully!');
        setEditingTask(null);
        fetchProjectTasksAndMembers(currentProject.id);
      } else {
        handleMessage(data.message);
      }
    } catch (error) {
      handleMessage('Network error updating task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!currentProject) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/${taskId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );
      if (response.ok) {
        handleMessage('Task deleted successfully!');
        fetchProjectTasksAndMembers(currentProject.id);
      } else {
        const data = await response.json();
        handleMessage(data.message);
      }
    } catch (error) {
      handleMessage('Network error deleting task.');
    }
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description);
    setEditTaskDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
    setEditTaskStatus(task.status);
    setEditTaskAssigneeId(task.assignee_id);
    setEditTaskPriority(task.priority);
    setEditTaskTags(task.tags.join(', '));
  };

  // --- User Profile ---
  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setViewingUserProfileData(data);
        setShowUserProfile(true);
      } else {
        const errorData = await response.json();
        handleMessage(errorData.message);
      }
    } catch (error) {
      handleMessage('Network error fetching user profile.');
    }
  };

  const handleCloseUserProfile = () => {
    setShowUserProfile(false);
    setViewingUserProfileData(null);
  };

  // --- UI Rendering ---
  const renderAuth = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
          <h1 className="text-3xl font-extrabold text-indigo-800 mb-6">TaskFlow</h1>
          {message && (
            <div className="bg-indigo-100 text-indigo-800 p-3 rounded-lg mb-4 text-center">
              {message}
            </div>
          )}
          {showRegister ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Register</h2>
              <form onSubmit={handleRegister} className="flex flex-col space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Register
                </button>
              </form>
              <button
                onClick={() => setShowRegister(false)}
                className="text-indigo-600 hover:underline"
              >
                Already have an account? Log in.
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Login</h2>
              <form onSubmit={handleLogin} className="flex flex-col space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Login
                </button>
              </form>
              <button
                onClick={() => setShowRegister(true)}
                className="text-indigo-600 hover:underline"
              >
                Don't have an account? Register.
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

const renderProjectSelection = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl flex justify-between items-center py-4 px-6 bg-white shadow-lg rounded-xl mb-8">
        <h1 className="text-3xl font-extrabold text-indigo-800">Welcome, {username}!</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white font-semibold p-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200"
        >
          Logout
        </button>
      </header>

      <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Projects</h2>
        {projectMessage && (
          <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-center">
            {projectMessage}
          </div>
        )}

        {/* ── Active Projects Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {projects.length > 0 ? (
            projects.map(project => (
              <div
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="bg-indigo-50 p-6 rounded-xl shadow-md hover:bg-indigo-100 transition-colors duration-200 cursor-pointer border-l-4 border-indigo-500"
              >
                <h3 className="text-xl font-bold text-indigo-800">{project.title}</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Members: {project.members.length}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-600">You are not a member of any projects yet.</p>
          )}
        </div>

        {/* ── Completed Projects Section ────────────────────────────── */}
        <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">
          Completed Projects
        </h2>
        {completedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {completedProjects.map(proj => (
              <div
                key={proj.id}
                className="bg-gray-100 p-6 rounded-xl shadow-md"
              >
                <h3 className="text-xl font-bold text-gray-800">{proj.title}</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Members: {proj.members.length}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 mb-6">
            You have no completed projects yet.
          </p>
        )}

        {/* ── Create / Join Buttons ─────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          <button
            onClick={() => setShowCreateProject(true)}
            className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Create New Project
          </button>
          <button
            onClick={() => setShowJoinProject(true)}
            className="bg-gray-600 text-white font-semibold p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            Join a Project
          </button>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Create New Project
            </h3>
            <form onSubmit={handleCreateProject} className="flex flex-col space-y-4">
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="Project Title"
                required
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                Create Project
              </button>
            </form>
            <button
              onClick={() => setShowCreateProject(false)}
              className="mt-4 w-full text-center text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Join Project Modal */}
      {showJoinProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Join a Project
            </h3>
            <form onSubmit={handleJoinProject} className="flex flex-col space-y-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Join Code"
                required
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-gray-600 text-white font-semibold p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Join Project
              </button>
            </form>
            <button
              onClick={() => setShowJoinProject(false)}
              className="mt-4 w-full text-center text-gray-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


 
const renderTaskManager = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* ── Project Header ──────────────────────────────────────────── */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center py-4 px-6 bg-white shadow-lg rounded-xl mb-8">
        <div className="flex items-center mb-4 md:mb-0">
          <button
            onClick={() => setCurrentProject(null)}
            className="flex items-center justify-center w-10 h-10 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors duration-200 mr-4"
            aria-label="Back to projects"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-extrabold text-indigo-800">
            {currentProject.title}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCompleteProject}
            className="bg-green-500 text-white font-semibold p-2 px-4 rounded-lg hover:bg-green-600 transition-colors duration-200"
          >
            Complete Project
          </button>
          <span className="text-lg text-gray-700 font-semibold">
            Logged in as: {username}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white font-semibold p-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </header>
      
        <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Task List</h2>
          {message && (
            <div className="bg-indigo-100 text-indigo-800 p-3 rounded-lg mb-4 text-center">
              {message}
            </div>
          )}
                  <div className="flex flex-col md:flex-row items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <label className="font-medium">Show:</label>
            <select
              value={taskFilter}
              onChange={e => setTaskFilter(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All</option>
              <option value="created">Created by Me</option>
              <option value="assigned">Assigned to Me</option>
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <label className="font-medium">Sort by Due Date:</label>
            <select
              value={taskSortOrder}
              onChange={e => setTaskSortOrder(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <button
              onClick={() => setShowAddTask(true)}
              className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 w-full md:w-auto"
            >
              Add New Task
            </button>
            <div className="text-sm font-medium text-gray-600 bg-gray-100 p-3 rounded-lg w-full md:w-auto text-center">
              Project Join Code: <span className="font-bold text-indigo-600">{currentProject.join_code}</span>
            </div>
          </div>

          <div className="space-y-4">
            {visibleTasks.length > 0 ? (
              visibleTasks.map((task) => (
                <div key={task.id} className="bg-gray-50 p-6 rounded-xl shadow-sm border-l-4 border-indigo-500 flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="flex-grow mb-4 md:mb-0">
                    <h3 className="text-xl font-bold text-gray-800">{task.title}</h3>
                    <p className="text-gray-600 mt-1">{task.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-white font-semibold text-xs ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {task.status}
                      </span>
                      <span className="ml-2">Priority: {task.priority}</span>
                      <span className="ml-2">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <span>Created by: 
                        <button onClick={() => fetchUserProfile(task.creator_id)} className="text-indigo-600 hover:underline ml-1">
                          {task.creator_username}
                        </button>
                      </span>
                      {task.assignee_username && (
                        <span className="ml-4">Assigned to: 
                          <button onClick={() => fetchUserProfile(task.assignee_id)} className="text-indigo-600 hover:underline ml-1">
                            {task.assignee_username}
                          </button>
                        </span>
                      )}
                    </div>
                    {task.tags.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Tags: {task.tags.map(tag => (
                          <span key={tag} className="bg-gray-200 rounded-full px-2 py-1 ml-1">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditTask(task)}
                      className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors duration-200"
                      aria-label="Edit Task"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors duration-200"
                      aria-label="Delete Task"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No tasks to display for this filter.</p>
            )}
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Add New Task</h3>
              <form onSubmit={handleCreateTask} className="flex flex-col space-y-4">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task Title"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Task Description"
                  rows="3"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                ></textarea>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign to...</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                    </option>
                  ))}
                </select>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="text"
                  value={newTaskTags}
                  onChange={(e) => setNewTaskTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Add Task
                </button>
              </form>
              <button
                onClick={() => setShowAddTask(false)}
                className="mt-4 w-full text-center text-gray-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Edit Task</h3>
              <form onSubmit={handleUpdateTask} className="flex flex-col space-y-4">
                <input
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Task Title"
                  required
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  placeholder="Task Description"
                  rows="3"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                ></textarea>
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={editTaskAssigneeId}
                  onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign to...</option>
                  {projectMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                    </option>
                  ))}
                </select>
                <select
                  value={editTaskPriority}
                  onChange={(e) => setEditTaskPriority(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="text"
                  value={editTaskTags}
                  onChange={(e) => setEditTaskTags(e.target.value)}
                  placeholder="Tags (comma separated)"
                  className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-semibold p-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Update Task
                </button>
              </form>
              <button
                onClick={() => setEditingTask(null)}
                className="mt-4 w-full text-center text-gray-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {showUserProfile && viewingUserProfileData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
              <div className="text-center">
                <h3 className="text-3xl font-extrabold text-indigo-800 mb-2">{viewingUserProfileData.username}'s Profile</h3>
                <p className="text-lg text-gray-700 mb-4">Email: {viewingUserProfileData.email}</p>

                <h4 className="text-xl font-semibold text-gray-700 mb-3">Tasks Created by {viewingUserProfileData.username}:</h4>
                {viewingUserProfileData.created_tasks.length > 0 ? (
                  <ul className="list-disc list-inside text-left text-gray-600 mb-4">
                    {viewingUserProfileData.created_tasks.map(task => (
                      <li key={task.id} className="mb-1">
                        <strong>{task.title}</strong> (Status: {task.status})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 mb-4">No tasks created by this user.</p>
                )}

                <h4 className="text-xl font-semibold text-gray-700 mb-3">Tasks Assigned to {viewingUserProfileData.username}:</h4>
                {viewingUserProfileData.assigned_tasks.length > 0 ? (
                  <ul className="list-disc list-inside text-left text-gray-600">
                    {viewingUserProfileData.assigned_tasks.map(task => (
                      <li key={task.id} className="mb-1">
                        <strong>{task.title}</strong> (Status: {task.status})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No tasks assigned to this user.</p>
                )}
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleCloseUserProfile}
                  className="bg-indigo-600 text-white font-semibold p-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderApp = () => {
    if (!isLoggedIn) {
      return renderAuth();
    }
    if (isLoggedIn && !currentProject) {
      return renderProjectSelection();
    }
    return renderTaskManager();
  };
  

  return renderApp();
}

export default App;
