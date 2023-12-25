import React, { useState } from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { v4 as uuidv4 } from "uuid";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Shop from "./shop";

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
    setTasks((previousTodos) =>
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
    <div>
      <div>
        <div>
          <Tabs value={tab} onChange={handleTabChange}>
            <Tab label="Home" />
            <Tab label="Personal" />
            <Tab label="Office" />
            <Tab label="Shop" />
          </Tabs>
        </div>
      </div>
      {tab === 0 && (
        <div>
          <h1 className="heading">To-Do List</h1>
          <Box
            component="form"
            sx={{
              "& > :not(style)": { m: 1, width: "25ch" },
            }}
            noValidate
            autoComplete="off"
          ></Box>
          <TextField
            id="outlined-basic"
            label="Enter a new task..."
            variant="outlined"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
          />
          {editableTaskId ? (
          <Button onClick={handleSaveEdit} variant="contained">
            Save Task
          </Button>
          ) : (
          <Button
            variant="contained"
            onClick={() => {
              handleAddTask(taskInput);
              setTaskInput("");
            }}>
            Add Task
          </Button>
          )}
          <div>
            <p>{todos.text}</p>
            <p className="text-xs text-gray-500">{todos.createdAt}</p>
          </div>
          <div>
            {todos.map((todo) => (
              <div key={todo.id}>
                <Stack direction="row">
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onClick={() => handleToggleTaskCompletion(todo.id)}
                  />
                  {todo.task}
                  <p style={{ fontSize: "12px" }}>{todo.createdAt}</p>
                  
                  <Button
                    variant="outlined"
                    onClick={() => handleDeleteTask(todo.id)}
                    sx={{ height: "35px" }}>
                    Delete
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleEditTask(todo.id)}
                    sx={{ height: "35px" }}>
                    Edit
                  </Button>
                </Stack>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 3 && <Shop />}
    </div>
  );
};

export default TodoList;