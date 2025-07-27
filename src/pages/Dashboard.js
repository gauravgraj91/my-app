import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { getCategoryInfo } from '../constants';
import { Card, Button, Modal, Input, StatCard, StatItem, StatGrid } from '../components/ui';

const Dashboard = () => {
  const navigate = useNavigate();

  // Use the custom hook for task management
  const { todos, stats, addTask, toggleTaskCompletion } = useTasks();

  // New task form state for quick add
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
    tags: [],
    estimatedTime: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTask = () => {
    try {
      addTask(newTask);
      setNewTask({
        title: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        dueDate: '',
        tags: [],
        estimatedTime: ''
      });
      setShowAddForm(false);
    } catch (error) {
      alert(error.message);
    }
  };



  // getCategoryInfo is now imported from constants
  // stats are now provided by the useTasks hook

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>Dashboard</h1>
        <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>Overview of all your activities</p>
      </div>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>

        {/* Tasks Widget */}
        <StatCard
          title="Tasks"
          icon="📝"
          onViewAll={() => navigate('/tasks')}
        >
          <StatGrid columns={2} style={{ marginBottom: 16 }}>
            <StatItem value={stats.completed} label="Completed" color="#22c55e" size="large" />
            <StatItem value={stats.pending} label="Pending" color="#2563eb" size="large" />
          </StatGrid>
          <StatGrid columns={2}>
            <StatItem value={stats.overdue} label="Overdue" color="#ef4444" />
            <StatItem value={stats.dueToday} label="Due Today" color="#f59e0b" />
          </StatGrid>
        </StatCard>

        {/* Shop Bills Widget */}
        <StatCard
          title="Shop Bills"
          icon="🛒"
          onViewAll={() => navigate('/shop/bills')}
        >
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <StatItem value="₹0" label="Total Sales" color="#10b981" size="large" />
          </div>
          <StatGrid columns={2}>
            <StatItem value="0" label="Products" color="#8b5cf6" />
            <StatItem value="₹0" label="Profit" color="#f59e0b" />
          </StatGrid>
        </StatCard>

        {/* Transactions Widget */}
        <StatCard
          title="Transactions"
          icon="💰"
          onViewAll={() => navigate('/shop/transactions')}
        >
          <StatGrid columns={2} style={{ marginBottom: 16 }}>
            <StatItem value="₹0" label="Cash In" color="#22c55e" />
            <StatItem value="₹0" label="Cash Out" color="#ef4444" />
          </StatGrid>
          <div style={{ textAlign: 'center' }}>
            <StatItem value="₹0" label="Net Balance" color="#2563eb" size="large" />
          </div>
        </StatCard>

        {/* Price List Widget */}
        <StatCard
          title="Price List"
          icon="📋"
          onViewAll={() => navigate('/shop/price-list')}
        >
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <StatItem value="9" label="Total Items" color="#8b5cf6" size="large" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Manage your product pricing and inventory</div>
          </div>
        </StatCard>
      </div>

      {/* Quick Actions */}
      <Card style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
            icon={<Plus size={18} />}
          >
            Add New Task
          </Button>
          <Button
            variant="success"
            onClick={() => navigate('/shop/bills')}
          >
            🛒 Add Product
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/shop/transactions')}
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            💰 Add Transaction
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/settings')}
          >
            ⚙️ Settings
          </Button>
        </div>
      </Card>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Recent Tasks */}
        <StatCard
          title="Recent Tasks"
          icon="📝"
          onViewAll={() => navigate('/tasks')}
        >
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {todos.slice(0, 3).map(todo => (
              <div key={todo.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={() => toggleTaskCompletion(todo.id)}
                  style={{ marginRight: 12 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: todo.isCompleted ? 'line-through' : 'none',
                    color: todo.isCompleted ? '#9ca3af' : '#111827'
                  }}>
                    {todo.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
                  </div>
                </div>
              </div>
            ))}
            {todos.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: 24 }}>
                No tasks yet. Create your first task!
              </div>
            )}
          </div>
        </StatCard>

        {/* System Status */}
        <Card>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#111827' }}>📊 System Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Data Storage</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#22c55e' }}>✅ Local</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Last Backup</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>Auto-saved</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Total Records</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#2563eb' }}>{stats.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>App Version</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>v1.0.0</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add New Task"
      >
        <Input
          label="Title *"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          placeholder="What needs to be done?"
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddTask}
          >
            Add Task
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;