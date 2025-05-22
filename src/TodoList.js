import React, { useState } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { v4 as uuidv4 } from "uuid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Shop from "./shop";
import ShopTransactions from "./shopTransactions";
import PriceList from "./PriceList";
import './styles/Todolist.css';

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
          </Tabs>
        </div>
      </div>
      {tab === 0 && (
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
    </Box>
  );
};

export default TodoList;