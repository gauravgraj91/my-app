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
    <div>
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
            {todos.map((todo) => (
              <div key={todo.id} style={{ marginBottom: "0" }}>
                <Stack direction="row" spacing={1}>
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onClick={() => handleToggleTaskCompletion(todo.id)}
                  />
                  {todo.task}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleEditTask(todo.id)}
                    sx={{ height: "35px", minWidth: "70px" }}>
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleDeleteTask(todo.id)}
                    sx={{ height: "35px", minWidth: "70px", color: 'red', borderColor: 'red' }}>
                    Delete
                  </Button>
                </Stack>
                <p style={{ fontSize: "10px", color: "gray", margin: "4px 0" }}>{todo.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 3 && <Shop />}
      {tab === 4 && <ShopTransactions />}
      {tab === 5 && <PriceList />}
    </div>
  );
};

export default TodoList;