import type { Translations } from './types';

export const en: Translations = {
  'devices.heading': 'Devices',
  'devices.connectMode': 'Connect Mode',
  'devices.connecting': 'Connecting...',

  'device.host': 'Host',
  'device.switch': 'Switch',
  'device.router': 'Router',
  'device.dnsServer': 'DNS Server',
  'device.webServer': 'Web Server',

  'scenario.ping.label': 'Ping',
  'scenario.ping.description': 'ICMP Echo Request/Reply (ARP → Ping)',
  'scenario.httpRequest.label': 'HTTP Request',
  'scenario.httpRequest.description': 'ARP → TCP 3-Way Handshake → HTTP',
  'scenario.dnsLookup.label': 'DNS Lookup',
  'scenario.dnsLookup.description': 'DNS Query → Response',

  'toolbar.scenario': 'Scenario:',
  'toolbar.play': 'Play',
  'toolbar.pause': 'Pause',
  'toolbar.step': 'Step',
  'toolbar.reset': 'Reset',
  'toolbar.speed': 'Speed:',
  'toolbar.save': 'Save',
  'toolbar.load': 'Load',
  'toolbar.eventsQueued': '{count} events queued',

  'panel.properties': 'Properties',
  'panel.selectPrompt': 'Select a device or connection to view its properties',
  'panel.interfaces': 'Interfaces',
  'panel.mac': 'MAC',
  'panel.ip': 'IP',
  'panel.mask': 'Mask',
  'panel.arpTable': 'ARP Table',
  'panel.tcpState': 'TCP State',
  'panel.deleteDevice': 'Delete Device',
  'panel.connection': 'Connection',
  'panel.from': 'From',
  'panel.to': 'To',
  'panel.status': 'Status',
  'panel.toggleStatus': 'Toggle Status',
  'panel.delete': 'Delete',
  'panel.packetLog': 'Packet Log',

  'log.timePrefix': 't=',

  'tool.select': 'Select',
  'tool.pan': 'Pan',
  'tool.zoomIn': 'Zoom In',
  'tool.zoomOut': 'Zoom Out',

  'help.title': 'How to Use',
  'help.step1': 'Drag a device from the left panel and drop it on the canvas.',
  'help.step2': 'Click "Connect Mode", then click two devices to create a link.',
  'help.step3': 'Choose a scenario (Ping, HTTP, DNS) from the toolbar and press Play.',
  'help.step4': 'Use "Step" to advance one event at a time, or adjust speed.',
  'help.step5': 'Click any device or connection to inspect its properties on the right panel.',

  'app.title': 'Network Simulator',
};
