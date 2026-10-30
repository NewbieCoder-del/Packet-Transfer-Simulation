export type Locale = 'en' | 'ko';

export interface Translations {
  // Device Palette
  'devices.heading': string;
  'devices.connectMode': string;
  'devices.connecting': string;

  // Device type labels
  'device.host': string;
  'device.switch': string;
  'device.router': string;
  'device.dnsServer': string;
  'device.webServer': string;

  // Scenarios
  'scenario.ping.label': string;
  'scenario.ping.description': string;
  'scenario.httpRequest.label': string;
  'scenario.httpRequest.description': string;
  'scenario.dnsLookup.label': string;
  'scenario.dnsLookup.description': string;

  // Toolbar
  'toolbar.scenario': string;
  'toolbar.play': string;
  'toolbar.pause': string;
  'toolbar.step': string;
  'toolbar.reset': string;
  'toolbar.speed': string;
  'toolbar.save': string;
  'toolbar.load': string;
  'toolbar.eventsQueued': string;

  // Status Panel
  'panel.properties': string;
  'panel.selectPrompt': string;
  'panel.interfaces': string;
  'panel.mac': string;
  'panel.ip': string;
  'panel.mask': string;
  'panel.arpTable': string;
  'panel.tcpState': string;
  'panel.deleteDevice': string;
  'panel.connection': string;
  'panel.from': string;
  'panel.to': string;
  'panel.status': string;
  'panel.toggleStatus': string;
  'panel.delete': string;
  'panel.packetLog': string;

  // Packet Log
  'log.timePrefix': string;

  // Canvas tools
  'tool.select': string;
  'tool.pan': string;
  'tool.zoomIn': string;
  'tool.zoomOut': string;

  // Help
  'help.title': string;
  'help.step1': string;
  'help.step2': string;
  'help.step3': string;
  'help.step4': string;
  'help.step5': string;

  // App
  'app.title': string;
}
