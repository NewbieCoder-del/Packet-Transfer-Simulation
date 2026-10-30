import type { Translations } from './types';

export const ko: Translations = {
  'devices.heading': '장치',
  'devices.connectMode': '연결 모드',
  'devices.connecting': '연결 중...',

  'device.host': '호스트',
  'device.switch': '스위치',
  'device.router': '라우터',
  'device.dnsServer': 'DNS 서버',
  'device.webServer': '웹 서버',

  'scenario.ping.label': 'Ping',
  'scenario.ping.description': 'ICMP Echo 요청/응답 (ARP → Ping)',
  'scenario.httpRequest.label': 'HTTP 요청',
  'scenario.httpRequest.description': 'ARP → TCP 3-Way 핸드셰이크 → HTTP',
  'scenario.dnsLookup.label': 'DNS 조회',
  'scenario.dnsLookup.description': 'DNS 쿼리 → 응답',

  'toolbar.scenario': '시나리오:',
  'toolbar.play': '재생',
  'toolbar.pause': '일시정지',
  'toolbar.step': '단계',
  'toolbar.reset': '초기화',
  'toolbar.speed': '속도:',
  'toolbar.save': '저장',
  'toolbar.load': '불러오기',
  'toolbar.eventsQueued': '{count}개 이벤트 대기 중',

  'panel.properties': '속성',
  'panel.selectPrompt': '장치 또는 연결을 선택하여 속성을 확인하세요',
  'panel.interfaces': '인터페이스',
  'panel.mac': 'MAC',
  'panel.ip': 'IP',
  'panel.mask': '서브넷 마스크',
  'panel.arpTable': 'ARP 테이블',
  'panel.tcpState': 'TCP 상태',
  'panel.deleteDevice': '장치 삭제',
  'panel.connection': '연결',
  'panel.from': '출발',
  'panel.to': '도착',
  'panel.status': '상태',
  'panel.toggleStatus': '상태 전환',
  'panel.delete': '삭제',
  'panel.packetLog': '패킷 로그',

  'log.timePrefix': 't=',

  'tool.select': '선택',
  'tool.pan': '이동',
  'tool.zoomIn': '확대',
  'tool.zoomOut': '축소',

  'help.title': '사용법',
  'help.step1': '왼쪽 패널에서 장치를 드래그하여 캔버스에 놓으세요.',
  'help.step2': '"연결 모드"를 클릭한 후, 두 장치를 차례로 클릭하면 연결됩니다.',
  'help.step3': '툴바에서 시나리오(Ping, HTTP, DNS)를 선택하고 재생을 누르세요.',
  'help.step4': '"단계" 버튼으로 이벤트를 하나씩 진행하거나, 속도를 조절하세요.',
  'help.step5': '장치나 연결을 클릭하면 오른쪽 패널에서 속성을 확인할 수 있습니다.',

  'app.title': '네트워크 시뮬레이터',
};
