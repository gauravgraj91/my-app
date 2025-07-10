import React, { useState, useEffect } from 'react';
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { v4 as uuidv4 } from "uuid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Shop from '../shop/shop';
import ShopTransactions from '../shop/shopTransactions';
import PriceList from '../shop/PriceList';
import Settings from '../settings/Settings';
import './Todolist.css';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = React.useState([]);
  const [editableTaskId, setEditableTaskId] = React.useState(null);
  const [taskInput, setTaskInput] = React.useState('');

  const handleAddTask = (task) => {
    if (!task.trim()) {
      alert("Task cannot be empty");
      return;
    }
    const newTask = {
      id: uuidv4(),
      task,
      createdAt: new Date().toLocaleString(),
      isCompleted: false,
    };
    setTodos([...todos, newTask]);
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleDeleteTask = (taskId) => {
    setTodos(todos.filter((todo) => todo.id !== taskId));
  };

  const handleEditTask = (taskId) => {
    const taskToEdit = todos.find((task) => task.id === taskId);
    if (taskToEdit) {
      setEditableTaskId(taskId);
      setTaskInput(taskToEdit.task);
    }
  };

  const handleSaveEdit = () => {
    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
          todo.id === editableTaskId ? { ...todo, task: taskInput } : todo
        )
      );
    setEditableTaskId(null);
    setTaskInput('');
  };

  const handleToggleTaskCompletion = (taskId) => {
    setTodos(
      todos.map((todo) => {
        if (todo.id === taskId) {
          return {
            ...todo,
            isCompleted: !todo.isCompleted,
          };
        } else {
          return todo;
        }
      })
    );
  };

  // Helper for stats
  const now = new Date();
  const completedCount = todos.filter(t => t.isCompleted).length;
  const pendingCount = todos.filter(t => !t.isCompleted).length;
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const oldTasks = todos.filter(t => {
    const created = new Date(t.createdAt);
    return !t.isCompleted && created < weekAgo;
  });
  const oldCount = oldTasks.length;

  return (
    <Box>
      <div>
        <div>
          <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="Home" />
            <Tab label="Personal" />
            <Tab label="Office" />
            <Tab label="Shop Bills" />
            <Tab label="Shop Transactions" />
            <Tab label="Price List" />
            <Tab label="Settings" />
          </Tabs>
        </div>
      </div>
      {tab === 0 && (
        <div className="dashboard-widgets" style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
          <div className="widget-card" style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32, minWidth: 320, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24, color: '#22223b', letterSpacing: 1 }}>To-Do List</h2>
            <div style={{ display: 'flex', gap: 24, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80 }}>
                <CheckCircle color="#22c55e" size={28} />
                <span style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>Completed</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>{completedCount}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80 }}>
                <Clock color="#2563eb" size={28} />
                <span style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>Pending</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{pendingCount}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80 }}>
                <AlertCircle color="#f59e42" size={28} />
                <span style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>Overdue</span>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e42', marginTop: 4 }}>{oldCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 1 && (
        <div className="todo-container">
          <h1 className="todo-heading">To-Do List</h1>
          <input
            className="todo-input"
            type="text"
            placeholder="Enter a new task..."
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            aria-label="Enter a new task"
          />
          {editableTaskId ? (
            <button className="todo-btn-primary" onClick={handleSaveEdit}>
              Save Task
            </button>
          ) : (
            <button
              className="todo-btn-primary"
              onClick={() => {
                handleAddTask(taskInput);
                setTaskInput("");
              }}
            >
              Add Task
            </button>
          )}
          <div className="todo-list">
            {todos.map((todo) => (
              <React.Fragment key={todo.id}>
                <div className="todo-item">
                  <input
                    className="todo-checkbox"
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggleTaskCompletion(todo.id)}
                    aria-label={todo.task}
                  />
                  <span className={`todo-task${todo.isCompleted ? ' completed' : ''}`}>{todo.task}</span>
                  <div>
                    <button
                      className="todo-btn-secondary"
                      onClick={() => handleEditTask(todo.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="todo-btn-danger"
                      onClick={() => handleDeleteTask(todo.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="todo-date">{todo.createdAt}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {tab === 3 && <Shop />}
      {tab === 4 && <ShopTransactions />}
      {tab === 5 && <PriceList />}
      {tab === 6 && <Settings />}
    </Box>
  );
};

export default TodoList;