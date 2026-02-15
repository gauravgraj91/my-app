import React, { useState } from 'react';
import { CheckCircle, Plus, Filter, Search, Edit2, Trash2, Copy, Archive, Calendar, Clock } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { TASK_CATEGORIES, TASK_PRIORITIES, getCategoryInfo, getPriorityInfo, formatDate, isOverdue } from '../constants';
import TaskItem from '../components/TaskItem'; // eslint-disable-line no-unused-vars
import { Card, Button, Modal, Input, Select, Textarea, Badge } from '../components/ui';
import { useNotifications } from '../components/ui/NotificationSystem';

const Tasks = () => {
  // Use custom hooks for task management and filtering
  // eslint-disable-next-line no-unused-vars
  const { todos, stats, addTask, deleteTask, updateTask, toggleTaskCompletion, duplicateTask, archiveCompleted } = useTasks();
  const completedCount = todos.filter(todo => todo.isCompleted).length;
  const {
    searchTerm, setSearchTerm,
    filterCategory, setFilterCategory,
    filterPriority, setFilterPriority,
    filterStatus, setFilterStatus,
    sortBy, setSortBy,
    filteredAndSortedTodos,
    // eslint-disable-next-line no-unused-vars
    hasActiveFilters
  } = useTaskFilters(todos);

  const [editableTaskId, setEditableTaskId] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { showError } = useNotifications();

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
    tags: [],
    estimatedTime: ''
  });

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
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask(taskId);
    }
  };

  const handleEditTask = (taskId) => {
    const taskToEdit = todos.find((task) => task.id === taskId);
    if (taskToEdit) {
      setEditableTaskId(taskId);
      setTaskInput(taskToEdit.title);
    }
  };

  const handleSaveEdit = () => {
    if (!taskInput.trim()) {
      showError("Task title cannot be empty");
      return;
    }

    updateTask(editableTaskId, { title: taskInput.trim() });
    setEditableTaskId(null);
    setTaskInput('');
  };

  const handleDuplicateTask = (taskId) => {
    duplicateTask(taskId);
  };

  const handleArchiveCompleted = () => {
    if (window.confirm("Archive all completed tasks?")) {
      archiveCompleted();
    }
  };

  // Add this handler for toggling task completion
  const handleToggleTaskCompletion = (taskId) => {
    toggleTaskCompletion(taskId);
  };

  // Filtering and helper functions are now handled by custom hooks

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter size={16} />}
          >
            Filters
          </Button>
          <Button
            variant="success"
            onClick={() => setShowAddForm(true)}
            icon={<Plus size={16} />}
          >
            New Task
          </Button>
          {completedCount > 0 && (
            <Button
              variant="secondary"
              onClick={handleArchiveCompleted}
              icon={<Archive size={16} />}
            >
              Archive Completed
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        {/* Search Bar */}
        <div style={{ marginBottom: showFilters ? 16 : 0 }}>
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={20} />}
            containerStyle={{ marginBottom: 0 }}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
            <Select
              label="Category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...TASK_CATEGORIES.map(cat => ({ value: cat.id, label: `${cat.icon} ${cat.name}` }))
              ]}
              containerStyle={{ marginBottom: 0 }}
            />
            <Select
              label="Priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                ...TASK_PRIORITIES.map(pri => ({ value: pri.id, label: `${pri.icon} ${pri.name}` }))
              ]}
              containerStyle={{ marginBottom: 0 }}
            />
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Tasks' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              containerStyle={{ marginBottom: 0 }}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'createdAt', label: 'Created Date' },
                { value: 'dueDate', label: 'Due Date' },
                { value: 'priority', label: 'Priority' },
                { value: 'category', label: 'Category' }
              ]}
              containerStyle={{ marginBottom: 0 }}
            />
          </div>
        )}
      </Card>

      {/* Task List */}
      <Card>
        {filteredAndSortedTodos.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>No tasks found</div>
            <div style={{ fontSize: 14 }}>
              {searchTerm || filterCategory !== 'all' || filterPriority !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first task to get started!'}
            </div>
          </div>
        ) : (
          filteredAndSortedTodos.map((todo, index) => (
            <div
              key={todo.id}
              style={{
                padding: 20,
                borderBottom: index < filteredAndSortedTodos.length - 1 ? '1px solid #f3f4f6' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16
              }}
            >
              <input
                type="checkbox"
                checked={todo.isCompleted}
                onChange={() => handleToggleTaskCompletion(todo.id)}
                style={{ marginTop: 4 }}
              />

              <div style={{ flex: 1 }}>
                {editableTaskId === todo.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        fontSize: 14
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                      autoFocus
                    />
                    <Button
                      variant="success"
                      size="small"
                      onClick={handleSaveEdit}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setEditableTaskId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: todo.isCompleted ? '#9ca3af' : '#111827',
                      textDecoration: todo.isCompleted ? 'line-through' : 'none',
                      marginBottom: 8
                    }}>
                      {todo.title}
                    </div>

                    {todo.description && (
                      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                        {todo.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                      <Badge
                        variant="primary"
                        icon={getCategoryInfo(todo.category).icon}
                        style={{
                          background: getCategoryInfo(todo.category).color + '20',
                          color: getCategoryInfo(todo.category).color
                        }}
                      >
                        {getCategoryInfo(todo.category).name}
                      </Badge>

                      <Badge
                        variant="primary"
                        icon={getPriorityInfo(todo.priority).icon}
                        style={{
                          background: getPriorityInfo(todo.priority).color + '20',
                          color: getPriorityInfo(todo.priority).color
                        }}
                      >
                        {getPriorityInfo(todo.priority).name}
                      </Badge>

                      {todo.dueDate && (
                        <span style={{
                          color: isOverdue(todo.dueDate) && !todo.isCompleted ? '#ef4444' : '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Calendar size={12} /> {formatDate(todo.dueDate)}
                        </span>
                      )}

                      {todo.estimatedTime && (
                        <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {todo.estimatedTime}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEditTask(todo.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 4
                  }}
                  title="Edit task"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDuplicateTask(todo.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 4
                  }}
                  title="Duplicate task"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleDeleteTask(todo.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: 4
                  }}
                  title="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

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

        <Textarea
          label="Description"
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          placeholder="Add more details..."
          rows={3}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select
            label="Category"
            value={newTask.category}
            onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
            options={TASK_CATEGORIES.map(cat => ({ value: cat.id, label: `${cat.icon} ${cat.name}` }))}
          />

          <Select
            label="Priority"
            value={newTask.priority}
            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            options={TASK_PRIORITIES.map(pri => ({ value: pri.id, label: `${pri.icon} ${pri.name}` }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            label="Due Date"
            type="date"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          />

          <Input
            label="Estimated Time"
            value={newTask.estimatedTime}
            onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
            placeholder="e.g., 2 hours"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
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

export default Tasks;