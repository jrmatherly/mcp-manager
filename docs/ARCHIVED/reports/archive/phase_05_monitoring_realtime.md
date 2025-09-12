# Phase 5: Monitoring & Real-time Features

**Phase**: 5 of 6  
**Duration**: 1 week  
**Status**: ⏳ **PLANNED**  
**Dependencies**: [Phase 4: Component Implementation](./phase_04_component_implementation.md)  

---

## 🎯 **Phase Objectives**

Implement comprehensive real-time monitoring, WebSocket integration, metrics dashboards, and performance monitoring capabilities.

### **Key Deliverables**
- ⏳ Real-time health monitoring with WebSocket integration
- ⏳ Metrics dashboard with Prometheus integration
- ⏳ Performance monitoring and alerting system
- ⏳ User activity analytics and session tracking
- ⏳ System health visualization and trend analysis
- ⏳ Audit log viewer with search and filtering

---

## 🏗️ **Key Implementation Areas**

### **1. WebSocket Integration**

```typescript
// WebSocket client for real-time updates
class MCPWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, Function[]>();

  connect(endpoint: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/${endpoint}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };
  }

  subscribe(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private handleMessage(data: any) {
    const handlers = this.eventHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data.payload));
  }
}
```

### **2. Real-time Health Monitoring**

```tsx
// Real-time system health dashboard
export function SystemHealthDashboard() {
  const [healthData, setHealthData] = useState<SystemHealth>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const wsClient = useWebSocket();

  useEffect(() => {
    wsClient.connect('health');
    wsClient.subscribe('health_update', (data: HealthUpdate) => {
      setHealthData(prev => ({ ...prev, ...data }));
    });

    wsClient.subscribe('connection_status', (status: string) => {
      setConnectionStatus(status as 'connected' | 'disconnected');
    });

    return () => wsClient.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection status indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">System Health</h2>
          <Badge variant={connectionStatus === 'connected' ? 'success' : 'destructive'}>
            {connectionStatus}
          </Badge>
        </div>
      </Card>

      {/* Server health grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(healthData.servers || {}).map(([serverId, health]) => (
          <ServerHealthCard key={serverId} serverId={serverId} health={health} />
        ))}
      </div>

      {/* System metrics */}
      <SystemMetricsCard metrics={healthData.system} />
    </div>
  );
}
```

### **3. Metrics Dashboard**

```tsx
// Comprehensive metrics dashboard with Prometheus integration
export function MetricsDashboard() {
  const { data: metrics, isLoading } = usePrometheusMetrics();
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [selectedMetric, setSelectedMetric] = useState('request_rate');

  if (isLoading) {
    return <MetricsLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Metrics controls */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">System Metrics</h2>
          <div className="flex space-x-4">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Key metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Request Rate"
          value={`${metrics?.request_rate || 0}/s`}
          trend={metrics?.request_rate_trend}
          icon={<Activity className="h-6 w-6" />}
        />
        <MetricCard 
          title="Error Rate"
          value={`${metrics?.error_rate || 0}%`}
          trend={metrics?.error_rate_trend}
          icon={<AlertTriangle className="h-6 w-6" />}
          variant={metrics?.error_rate > 5 ? 'danger' : 'success'}
        />
        <MetricCard 
          title="Response Time"
          value={`${metrics?.avg_response_time || 0}ms`}
          trend={metrics?.response_time_trend}
          icon={<Clock className="h-6 w-6" />}
        />
        <MetricCard 
          title="Active Connections"
          value={metrics?.active_connections || 0}
          trend={metrics?.connections_trend}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      {/* Detailed charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Request Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics?.timeseries?.request_volume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Response Time Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics?.timeseries?.response_time}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="p50" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="p95" 
                stackId="1" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
```

### **4. User Activity Analytics**

```tsx
// User activity tracking and analytics
export function UserActivityAnalytics() {
  const { data: activityData } = useUserActivityAnalytics();
  const { data: sessionData } = useSessionAnalytics();
  const [selectedPeriod, setSelectedPeriod] = useState('24h');

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">User Activity Analytics</h2>
        
        {/* Activity overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Active Users</p>
                <p className="text-2xl font-bold text-blue-900">
                  {activityData?.active_users || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Sessions Today</p>
                <p className="text-2xl font-bold text-green-900">
                  {sessionData?.sessions_today || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Session Duration</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatDuration(sessionData?.avg_duration || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData?.timeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="active_users" 
                stroke="#2563eb" 
                fill="#2563eb" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User behavior insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Most Active Pages</h3>
            <div className="space-y-3">
              {activityData?.popular_pages?.map((page, index) => (
                <div key={page.path} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{page.title}</p>
                    <p className="text-sm text-gray-600">{page.path}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{page.visits}</p>
                    <p className="text-xs text-gray-500">visits</p>
                  </div>
                </div>
              )) || []}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">User Actions</h3>
            <div className="space-y-3">
              {activityData?.user_actions?.map((action, index) => (
                <div key={action.type} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-sm text-gray-600">{action.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{action.count}</p>
                    <p className="text-xs text-gray-500">actions</p>
                  </div>
                </div>
              )) || []}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

### **5. Alerting System**

```tsx
// Real-time alerting and notifications
export function AlertingSystem() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const wsClient = useWebSocket();

  useEffect(() => {
    // Subscribe to real-time alerts
    wsClient.subscribe('alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 99)]); // Keep last 100 alerts
      
      // Show toast notification for critical alerts
      if (alert.severity === 'critical') {
        toast.error(`Critical Alert: ${alert.message}`);
      }
    });

    // Load alert settings
    loadAlertSettings().then(setAlertSettings);
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AlertSummaryCard 
          title="Critical"
          count={alerts.filter(a => a.severity === 'critical').length}
          color="red"
        />
        <AlertSummaryCard 
          title="Warning"
          count={alerts.filter(a => a.severity === 'warning').length}
          color="yellow"
        />
        <AlertSummaryCard 
          title="Info"
          count={alerts.filter(a => a.severity === 'info').length}
          color="blue"
        />
        <AlertSummaryCard 
          title="Resolved"
          count={alerts.filter(a => a.status === 'resolved').length}
          color="green"
        />
      </div>

      {/* Recent alerts */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Alerts</h2>
          <Button onClick={() => setAlerts([])} variant="outline" size="sm">
            Clear All
          </Button>
        </div>
        
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
          
          {alerts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2" />
              <p>No active alerts. System is running smoothly!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Alert configuration */}
      {alertSettings && (
        <AlertSettingsPanel 
          settings={alertSettings}
          onUpdate={setAlertSettings}
        />
      )}
    </div>
  );
}
```

### **6. Audit Log Viewer**

```tsx
// Comprehensive audit log viewer with search and filtering
export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateRange: 'last_24h',
    eventType: 'all',
    severity: 'all',
    userId: '',
    search: ''
  });

  const { data: auditLogs, isLoading } = useAuditLogs(filters);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="dateRange">Date Range</Label>
            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_1h">Last Hour</SelectItem>
                <SelectItem value="last_24h">Last 24 Hours</SelectItem>
                <SelectItem value="last_7d">Last 7 Days</SelectItem>
                <SelectItem value="last_30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="eventType">Event Type</Label>
            <Select 
              value={filters.eventType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="data_modification">Data Changes</SelectItem>
                <SelectItem value="security">Security Events</SelectItem>
                <SelectItem value="business">Business Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select 
              value={filters.severity} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="userId">User ID</Label>
            <Input 
              id="userId"
              placeholder="Filter by user..."
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="search">Search</Label>
            <Input 
              id="search"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {/* Logs table */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.event}</Badge>
                  </TableCell>
                  <TableCell>{log.userId || 'System'}</TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(log.severity)}>
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.description}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => openLogDetails(log)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🧪 **Testing Strategy**

### **WebSocket Testing**

```typescript
// WebSocket connection and message handling tests
describe('WebSocket Integration', () => {
  let mockWebSocket: MockWebSocket;
  
  beforeEach(() => {
    mockWebSocket = new MockWebSocket('ws://localhost:8000/ws/health');
  });
  
  it('should handle real-time health updates', async () => {
    const { getByTestId } = render(<SystemHealthDashboard />);
    
    // Simulate WebSocket message
    mockWebSocket.simulateMessage({
      type: 'health_update',
      payload: {
        serverId: 'test-server',
        status: 'healthy',
        responseTime: 50
      }
    });
    
    // Verify UI update
    await waitFor(() => {
      expect(getByTestId('server-status')).toHaveTextContent('healthy');
    });
  });
});
```

### **Performance Testing**

```typescript
// Performance testing for real-time components
describe('Performance Tests', () => {
  it('should handle high-frequency updates efficiently', async () => {
    const { rerender } = render(<MetricsDashboard />);
    
    const startTime = performance.now();
    
    // Simulate rapid updates
    for (let i = 0; i < 100; i++) {
      rerender(<MetricsDashboard key={i} />);
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
  });
});
```

---

## 📊 **Success Metrics**

### **Real-time Performance**

| Metric | Target | Validation |
|--------|--------|------------|
| **WebSocket Connection Time** | <500ms | Connection timing tests |
| **Message Processing Latency** | <100ms | Real-time update tests |
| **UI Update Performance** | <16ms (60fps) | React DevTools Profiler |
| **Memory Usage** | <50MB increase | Memory profiling |

### **Monitoring Quality**

| Feature | Target | Measurement |
|---------|--------|-------------|
| **Metric Accuracy** | >99% | Data validation tests |
| **Alert Response Time** | <5 seconds | Alert system tests |
| **Dashboard Load Time** | <2 seconds | Performance monitoring |
| **Data Retention** | 30 days | Storage validation |

---

## 🚀 **Next Phase**

**Phase 5 Status**: ⏳ **PLANNED**  
**Next Phase**: [Phase 6: Production Deployment](./phase_06_production_deployment.md)

### **Phase 5 Deliverables for Phase 6**

- ✅ Real-time monitoring system with WebSocket integration
- ✅ Comprehensive metrics dashboard with Prometheus
- ✅ User activity analytics and session tracking
- ✅ Alerting system with configurable notifications
- ✅ Audit log viewer with search and filtering
- ✅ Performance monitoring and health checks

---

**Phase 5 Focus**: Complete monitoring and real-time capabilities  
**Implementation Approach**: Performance-first with comprehensive observability
