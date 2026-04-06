import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import type { Task } from './src/types/task';

/**
 * App root — simple stack-style state navigation (no library dependency
 * needed for this preview; swap for React Navigation in production).
 */
export default function App() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  return (
    <SafeAreaProvider>
      {selectedTask ? (
        <TaskDetailScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onStatusChange={(id, status) => {
            console.log('[TaskDetail] status change', id, status);
          }}
          onLocationSave={(id, location) => {
            console.log('[TaskDetail] location saved', id, location);
          }}
          onCashPayment={id => {
            console.log('[TaskDetail] cash payment recorded', id);
          }}
        />
      ) : (
        <TaskListScreen onSelectTask={setSelectedTask} />
      )}
    </SafeAreaProvider>
  );
}
