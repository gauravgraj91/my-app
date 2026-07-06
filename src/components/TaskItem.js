import React, { memo } from 'react';
import { Edit2, Trash2, Copy, Calendar, Clock } from 'lucide-react';
import { getCategoryInfo, getPriorityInfo, formatDate, isOverdue } from '../constants';

const TaskItem = memo(({ 
  todo, 
  onToggle, 
  onEdit, 
  onDelete, 
  onDuplicate,
  isEditing,
  editValue,
  onEditChange,
  onSaveEdit,
  onCancelEdit
}) => {
  return (
    <div style={{
      padding: 20,
      borderBottom: '1px solid var(--secondary)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16
    }}>
      <input
        type="checkbox"
        checked={todo.isCompleted}
        onChange={() => onToggle(todo.id)}
        style={{ marginTop: 4 }}
      />
      
      <div style={{ flex: 1 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--input)',
                borderRadius: 6,
                fontSize: 14
              }}
              onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
              autoFocus
            />
            <button
              onClick={onSaveEdit}
              style={{
                background: 'var(--success)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              style={{
                background: 'var(--muted-foreground)',
                color: 'var(--primary-foreground)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 16,
              fontWeight: 500,
              color: todo.isCompleted ? 'var(--muted-foreground)' : 'var(--foreground)',
              textDecoration: todo.isCompleted ? 'line-through' : 'none',
              marginBottom: 8
            }}>
              {todo.title}
            </div>
            
            {todo.description && (
              <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 8 }}>
                {todo.description}
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
              <span style={{
                background: `color-mix(in srgb, ${getCategoryInfo(todo.category).color} 12%, transparent)`,
                color: getCategoryInfo(todo.category).color,
                padding: '4px 8px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {getCategoryInfo(todo.category).icon} {getCategoryInfo(todo.category).name}
              </span>
              
              <span style={{
                background: `color-mix(in srgb, ${getPriorityInfo(todo.priority).color} 12%, transparent)`,
                color: getPriorityInfo(todo.priority).color,
                padding: '4px 8px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {getPriorityInfo(todo.priority).icon} {getPriorityInfo(todo.priority).name}
              </span>
              
              {todo.dueDate && (
                <span style={{
                  color: isOverdue(todo.dueDate) && !todo.isCompleted ? 'var(--danger)' : 'var(--muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Calendar size={12} /> {formatDate(todo.dueDate)}
                </span>
              )}
              
              {todo.estimatedTime && (
                <span style={{ color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {todo.estimatedTime}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onEdit(todo.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            padding: 4
          }}
          title="Edit task"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDuplicate(todo.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            padding: 4
          }}
          title="Duplicate task"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger)',
            cursor: 'pointer',
            padding: 4
          }}
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;