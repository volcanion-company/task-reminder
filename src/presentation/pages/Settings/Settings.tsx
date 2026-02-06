import { Bell, Moon, Sun, Save, Upload, Trash2, FileJson, FileSpreadsheet } from 'lucide-react';
import { useSettingsStore } from '@app/store/settingsStore';
import { toast } from '@app/store/toastStore';
import { exportTasksToJSON, exportTasksToCSV, importTasksFromJSON, importTasksFromCSV } from '@infrastructure/api/taskApi';
import { exportRemindersToJSON, exportRemindersToCSV, importRemindersFromJSON, importRemindersFromCSV } from '@infrastructure/api/reminderApi';
import { useState, useRef } from 'react';

export default function Settings() {
  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled, autoStart, setAutoStart } = useSettingsStore();
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    // Settings are automatically saved to Zustand store
    // In a real app, this would also persist to backend/localStorage
    toast.success('Settings saved', 'Your preferences have been updated');
  };

  const handleExportTasks = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportTasksToJSON();
      
      // Create blob and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export successful', 'Tasks exported to JSON file');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', 'Could not export tasks');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReminders = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportRemindersToJSON();
      
      // Create blob and download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reminders-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export successful', 'Reminders exported to JSON file');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', 'Could not export reminders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTasksCSV = async () => {
    setIsExporting(true);
    try {
      const csvData = await exportTasksToCSV();
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export successful', 'Tasks exported to CSV file');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', 'Could not export tasks');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRemindersCSV = async () => {
    setIsExporting(true);
    try {
      const csvData = await exportRemindersToCSV();
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reminders-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Export successful', 'Reminders exported to CSV file');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', 'Could not export reminders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsExporting(true); // Reuse loading state
      const content = await file.text();
      const isJSON = file.name.endsWith('.json');
      const isCSV = file.name.endsWith('.csv');
      
      if (!isJSON && !isCSV) {
        toast.error('Invalid file', 'Please select a JSON or CSV file');
        return;
      }

      // Determine if it's tasks or reminders based on content
      let count = 0;
      if (isJSON) {
        const data = JSON.parse(content);
        // Check if it's tasks or reminders by looking at first object
        if (data.length > 0 && 'status' in data[0]) {
          count = await importTasksFromJSON(content);
          toast.success('Import successful', `Imported ${count} tasks`);
        } else if (data.length > 0 && 'remind_at' in data[0]) {
          count = await importRemindersFromJSON(content);
          toast.success('Import successful', `Imported ${count} reminders`);
        } else {
          toast.error('Invalid format', 'Could not determine data type');
        }
      } else if (isCSV) {
        // Check CSV header to determine type
        const firstLine = content.split('\n')[0];
        if (firstLine.includes('status') && firstLine.includes('priority')) {
          count = await importTasksFromCSV(content);
          toast.success('Import successful', `Imported ${count} tasks`);
        } else if (firstLine.includes('remind_at')) {
          count = await importRemindersFromCSV(content);
          toast.success('Import successful', `Imported ${count} reminders`);
        } else {
          toast.error('Invalid format', 'Could not determine data type from CSV header');
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed', 'Could not import data');
    } finally {
      setIsExporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">Theme</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="font-medium">Light</span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="font-medium">Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Enable Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive desktop notifications for task reminders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {notificationsEnabled && (
              <div className="ml-8 pl-4 border-l-2 border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm">Sound</p>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm">Badge</p>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">System</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Launch at Startup</p>
                <p className="text-sm text-muted-foreground">
                  Automatically start the app when you log in
                </p>
              </div>
              <button
                onClick={() => setAutoStart(!autoStart)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoStart ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoStart ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="font-medium">App Version</p>
                <p className="text-sm text-muted-foreground">1.0.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          
          <div className="space-y-4">
            {/* Export Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">EXPORT</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleExportTasks}
                    disabled={isExporting}
                    className="px-3 py-2 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Tasks JSON</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={handleExportTasksCSV}
                    disabled={isExporting}
                    className="px-3 py-2 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Tasks CSV</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleExportReminders}
                    disabled={isExporting}
                    className="px-3 py-2 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Reminders JSON</p>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={handleExportRemindersCSV}
                    disabled={isExporting}
                    className="px-3 py-2 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Reminders CSV</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Import Section */}
            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">IMPORT</h3>
              <button 
                onClick={handleImport}
                disabled={isExporting}
                className="w-full px-4 py-3 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Import Data</p>
                    <p className="text-sm text-muted-foreground">
                      {isExporting ? 'Importing...' : 'Import tasks or reminders from JSON/CSV file'}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">DANGER ZONE</h3>
              <button className="w-full px-4 py-3 text-left rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-medium">Clear All Data</p>
                    <p className="text-sm">Permanently delete all tasks and reminders</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Save className="w-5 h-5" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
