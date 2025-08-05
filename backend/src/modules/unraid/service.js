const BaseService = require('../../utils/baseService');

class UnraidService extends BaseService {
  constructor() {
    super('Unraid');
  }

  buildUrl(host, port, path) {
    // Unraid typically uses HTTPS on 443 or HTTP on 80/custom port
    const protocol = port === 443 ? 'https' : 'http';
    return `${protocol}://${host}:${port}${path}`;
  }

  getHeaders(config) {
    return {
      'x-api-key': config.api_key,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async testConnection(config) {
    try {
      // Test with a simple GraphQL query to get system info
      const query = `
        query {
          info {
            os {
              platform
              version
            }
            cpu {
              cores
            }
          }
        }
      `;

      const url = this.buildUrl(config.host, config.port, '/graphql');
      const response = await this.axios.post(url, 
        { query },
        { headers: this.getHeaders(config) }
      );
      
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const systemInfo = response.data.data?.info;
      return {
        success: true,
        version: systemInfo?.os?.version || 'Unknown',
        message: `Connected to Unraid ${systemInfo?.os?.platform || 'Server'}`,
        details: {
          cores: systemInfo?.cpu?.cores,
          platform: systemInfo?.os?.platform
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Connection failed'
      };
    }
  }

  async getStats(config) {
    try {
      console.log(`Fetching comprehensive Unraid stats from ${config.host}:${config.port}`);
      
      // Comprehensive GraphQL query for system monitoring
      const query = `
        query {
          info {
            os {
              platform
              version
              uptime
            }
            cpu {
              cores
              model
              usage
            }
            memory {
              total
              used
              available
              percent
            }
          }
          array {
            status
            protection
            numDisks
            numDevices
            size
            used
            free
            percentUsed
          }
          disks {
            name
            device
            type
            status
            size
            used
            free
            temp
            errors
          }
          shares {
            name
            size
            used
            free
            allocation
          }
          docker {
            containers {
              name
              image
              status
              state
              ports
              created
              started
              cpu
              memory
            }
            networks {
              name
              driver
              scope
            }
          }
          vms {
            name
            status
            state
            vcpus
            memory
            autostart
          }
          notifications {
            count
            unread
            recent {
              type
              subject
              description
              timestamp
            }
          }
          network {
            interfaces {
              name
              type
              status
              speed
              rxBytes
              txBytes
            }
          }
        }
      `;

      const url = this.buildUrl(config.host, config.port, '/graphql');
      const response = await this.axios.post(url, 
        { query },
        { 
          headers: this.getHeaders(config),
          timeout: 15000 // Longer timeout for comprehensive data
        }
      );
      
      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        // Continue with partial data if available
      }

      const data = response.data.data || {};
      
      // Process and format the data
      const stats = this.processUnraidData(data);
      
      return {
        ...stats,
        status: 'online',
        version: data.info?.os?.version || 'Unknown',
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching Unraid stats:', error.message);
      return {
        status: 'error',
        error: error.message,
        serverName: 'Unknown',
        arrays: 0,
        containers: 0,
        vms: 0,
        uptime: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  processUnraidData(data) {
    const { info, array, disks, shares, docker, vms, notifications, network } = data;
    
    // System Information
    const systemInfo = {
      serverName: info?.os?.platform || 'Unraid Server',
      version: info?.os?.version || 'Unknown',
      uptime: info?.os?.uptime || 0,
      cpuCores: info?.cpu?.cores || 0,
      cpuModel: info?.cpu?.model || 'Unknown',
      cpuUsage: info?.cpu?.usage || 0
    };

    // Memory Information
    const memoryInfo = {
      total: this.formatBytes(info?.memory?.total || 0),
      used: this.formatBytes(info?.memory?.used || 0),
      available: this.formatBytes(info?.memory?.available || 0),
      percent: info?.memory?.percent || 0
    };

    // Array Information
    const arrayInfo = {
      status: array?.status || 'Unknown',
      protection: array?.protection || 'None',
      numDisks: array?.numDisks || 0,
      numDevices: array?.numDevices || 0,
      size: this.formatBytes(array?.size || 0),
      used: this.formatBytes(array?.used || 0),
      free: this.formatBytes(array?.free || 0),
      percentUsed: array?.percentUsed || 0
    };

    // Disk Information
    const diskInfo = {
      count: disks?.length || 0,
      disks: (disks || []).map(disk => ({
        name: disk.name,
        device: disk.device,
        type: disk.type,
        status: disk.status,
        size: this.formatBytes(disk.size || 0),
        used: this.formatBytes(disk.used || 0),
        free: this.formatBytes(disk.free || 0),
        temp: disk.temp ? `${disk.temp}°C` : 'Unknown',
        errors: disk.errors || 0
      })),
      healthyDisks: (disks || []).filter(d => d.status === 'normal').length,
      warningDisks: (disks || []).filter(d => d.status === 'warning').length,
      errorDisks: (disks || []).filter(d => d.status === 'error').length
    };

    // Share Information
    const shareInfo = {
      count: shares?.length || 0,
      shares: (shares || []).slice(0, 10).map(share => ({
        name: share.name,
        size: this.formatBytes(share.size || 0),
        used: this.formatBytes(share.used || 0),
        free: this.formatBytes(share.free || 0),
        allocation: share.allocation || 'Unknown'
      }))
    };

    // Docker Information
    const dockerInfo = {
      totalContainers: docker?.containers?.length || 0,
      runningContainers: (docker?.containers || []).filter(c => c.status === 'running').length,
      stoppedContainers: (docker?.containers || []).filter(c => c.status === 'stopped').length,
      containers: (docker?.containers || []).slice(0, 20).map(container => ({
        name: container.name,
        image: container.image,
        status: container.status,
        state: container.state,
        ports: container.ports || [],
        created: container.created,
        started: container.started,
        cpu: container.cpu || 0,
        memory: this.formatBytes(container.memory || 0)
      })),
      networks: (docker?.networks || []).map(net => ({
        name: net.name,
        driver: net.driver,
        scope: net.scope
      }))
    };

    // VM Information
    const vmInfo = {
      totalVMs: vms?.length || 0,
      runningVMs: (vms || []).filter(vm => vm.status === 'running').length,
      stoppedVMs: (vms || []).filter(vm => vm.status === 'stopped').length,
      vms: (vms || []).map(vm => ({
        name: vm.name,
        status: vm.status,
        state: vm.state,
        vcpus: vm.vcpus || 0,
        memory: this.formatBytes(vm.memory || 0),
        autostart: vm.autostart || false
      }))
    };

    // Notification Information
    const notificationInfo = {
      total: notifications?.count || 0,
      unread: notifications?.unread || 0,
      recent: (notifications?.recent || []).slice(0, 5).map(notif => ({
        type: notif.type,
        subject: notif.subject,
        description: notif.description,
        timestamp: notif.timestamp
      }))
    };

    // Network Information
    const networkInfo = {
      interfaces: (network?.interfaces || []).map(iface => ({
        name: iface.name,
        type: iface.type,
        status: iface.status,
        speed: iface.speed,
        rxBytes: this.formatBytes(iface.rxBytes || 0),
        txBytes: this.formatBytes(iface.txBytes || 0)
      }))
    };

    return {
      system: systemInfo,
      memory: memoryInfo,
      array: arrayInfo,
      disks: diskInfo,
      shares: shareInfo,
      docker: dockerInfo,
      vms: vmInfo,
      notifications: notificationInfo,
      network: networkInfo,
      
      // Summary stats for dashboard
      arrays: 1, // Unraid typically has one array
      containers: dockerInfo.totalContainers,
      runningContainers: dockerInfo.runningContainers,
      totalVMs: vmInfo.totalVMs,
      runningVMs: vmInfo.runningVMs,
      totalStorage: arrayInfo.size,
      usedStorage: arrayInfo.used,
      freeStorage: arrayInfo.free,
      storagePercent: arrayInfo.percentUsed,
      uptime: this.formatUptime(systemInfo.uptime),
      alerts: notificationInfo.unread,
      diskHealth: {
        healthy: diskInfo.healthyDisks,
        warning: diskInfo.warningDisks,
        error: diskInfo.errorDisks,
        total: diskInfo.count
      }
    };
  }

  formatUptime(seconds) {
    if (!seconds) return '0 seconds';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

module.exports = new UnraidService();