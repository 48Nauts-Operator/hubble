// ABOUTME: Docker container discovery panel with scan, preview, and import functionality
// ABOUTME: Provides UI for auto-detecting containers and converting them to bookmarks

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Container,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
  Server,
  Globe,
  ExternalLink,
  Clock
} from 'lucide-react';
import { discoveryApi, type DiscoveredService, type DiscoveryStatus } from '@/services/discoveryApi';
import { cn } from '@/utils/cn';

interface DiscoveryPanelProps {
  className?: string;
  onServicesImported?: () => void;
}

interface ServiceCardProps {
  service: DiscoveredService;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

function ServiceCard({ service, selected, onToggle }: ServiceCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return '🗄️';
      case 'webserver':
        return '🌐';
      case 'application':
        return '🚀';
      case 'monitoring':
        return '📊';
      case 'cache':
        return '⚡';
      case 'proxy':
        return '🔀';
      default:
        return '⚙️';
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env?.toLowerCase()) {
      case 'production':
      case 'prod':
        return 'text-red-500';
      case 'staging':
      case 'uat':
        return 'text-yellow-500';
      case 'development':
      case 'dev':
        return 'text-blue-500';
      case 'local':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative"
    >
      <Card
        className={cn(
          "relative cursor-pointer transition-all duration-200 hover:shadow-md",
          selected
            ? "ring-2 ring-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
            : "hover:bg-muted/50"
        )}
        onClick={() => onToggle(!selected)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getTypeIcon(service.detected_type)}</div>
              <div>
                <CardTitle className="text-base font-medium">
                  {service.bookmark_data.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {service.image}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {service.bookmark_data.environment && (
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full bg-muted",
                  getEnvironmentColor(service.bookmark_data.environment)
                )}>
                  {service.bookmark_data.environment.toUpperCase()}
                </span>
              )}
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                selected
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-muted-foreground/30"
              )}>
                {selected && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* URLs */}
            <div className="space-y-1">
              {service.urls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground font-mono text-xs truncate">
                    {url}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(url, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Ports */}
            {service.ports.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {service.ports.map((port, index) => (
                  <span
                    key={index}
                    className="text-xs bg-muted px-2 py-1 rounded font-mono"
                  >
                    {port.host}→{port.container}
                  </span>
                ))}
              </div>
            )}
            
            {/* Tags */}
            {service.bookmark_data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {service.bookmark_data.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {service.bookmark_data.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{service.bookmark_data.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Group suggestion */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Server className="h-3 w-3" />
              <span>Will be added to: <strong>{service.suggested_group}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DiscoveryPanel({ className, onServicesImported }: DiscoveryPanelProps) {
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredService[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const statusData = await discoveryApi.getStatus();
      setStatus(statusData);
      
      if (!statusData.docker_available) {
        setError('Docker is not available. Make sure Docker is running and accessible.');
      }
    } catch (err) {
      console.error('Failed to load discovery status:', err);
      setError('Failed to check Docker status');
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const result = await discoveryApi.scanContainers();
      
      if (result.success) {
        setDiscoveredServices(result.services);
        setLastScan(result.timestamp);
        
        // Auto-select all discovered services
        const serviceIds = new Set(result.services.map(s => s.id));
        setSelectedServices(serviceIds);
      } else {
        setError(result.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    const servicesToImport = discoveredServices.filter(s => selectedServices.has(s.id));
    
    if (servicesToImport.length === 0) {
      setError('Please select at least one service to import');
      return;
    }
    
    setIsImporting(true);
    setError(null);
    
    try {
      const result = await discoveryApi.importServices(servicesToImport);
      
      if (result.success) {
        // Clear selections and discovered services
        setSelectedServices(new Set());
        setDiscoveredServices([]);
        
        // Notify parent component
        onServicesImported?.();
        
        // Show success message (you might want to use a toast instead)
        alert(`Successfully imported ${result.imported} services!`);
      } else {
        setError('Import failed');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(discoveredServices.map(s => s.id));
    setSelectedServices(allIds);
  };

  const handleSelectNone = () => {
    setSelectedServices(new Set());
  };

  const handleToggleService = (serviceId: string, selected: boolean) => {
    const newSelected = new Set(selectedServices);
    if (selected) {
      newSelected.add(serviceId);
    } else {
      newSelected.delete(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const selectedCount = selectedServices.size;

  return (
    <motion.div
      className={cn("space-y-6", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Container className="h-6 w-6" />
            <span>Container Discovery</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Automatically discover running Docker containers and add them as bookmarks
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadStatus}
            disabled={isScanning}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          
          <Button
            onClick={handleScan}
            disabled={!status?.docker_available || isScanning}
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isScanning ? 'Scanning...' : 'Scan Containers'}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      {status && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  status.docker_available ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <p className="text-sm font-medium">Docker Status</p>
                  <p className="text-xs text-muted-foreground">
                    {status.docker_available ? 'Available' : 'Unavailable'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Container className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {status.containers_running} Running
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status.containers_total} Total Containers
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Scan</p>
                  <p className="text-xs text-muted-foreground">
                    {lastScan 
                      ? new Date(lastScan).toLocaleTimeString() 
                      : status.last_scan
                      ? new Date(status.last_scan).toLocaleTimeString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Discovered Services */}
      {discoveredServices.length > 0 && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">
                Discovered Services ({discoveredServices.length})
              </h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectNone}>
                  Select None
                </Button>
              </div>
            </div>
            
            {selectedCount > 0 && (
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Import {selectedCount} Service{selectedCount !== 1 ? 's' : ''}
              </Button>
            )}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {discoveredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={selectedServices.has(service.id)}
                  onToggle={(selected) => handleToggleService(service.id, selected)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && discoveredServices.length === 0 && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Container className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No containers discovered</h3>
              <p className="text-muted-foreground mb-4">
                Click "Scan Containers" to discover running Docker containers
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}