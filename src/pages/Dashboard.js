import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { getCategoryInfo } from '../constants';
import { Card, Button, Modal, Input, StatCard, StatItem, StatGrid } from '../components/ui';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

export default function Dashboard() {
  return <AnalyticsDashboard />;
}