export const DEFAULT_TEMPLATES = [
  {
    id: 'meeting',
    title: '📅 회의록',
    description: '회의 안건, 논의 내용, 결정 사항을 기록하는 서식입니다.',
    content: `<h1>📅 회의록</h1>
<p><strong>일시:</strong> 2024년 0월 0일<br><strong>참석자:</strong> <br><strong>장소:</strong> </p>
<hr>
<h3>📝 안건</h3>
<ul>
<li>안건 1</li>
<li>안건 2</li>
</ul>
<h3>💬 논의 내용</h3>
<p>내용을 입력하세요.</p>
<h3>✅ 결정 사항 및 할 일</h3>
<ul>
<li><input type="checkbox"> 할 일 1</li>
</ul>`
  },
  {
    id: 'daily',
    title: '📋 일일 업무 보고',
    description: '금일 진행 업무와 익일 계획을 정리하는 서식입니다.',
    content: `<h1>📋 일일 업무 보고</h1>
<p><strong>날짜:</strong> 2024년 0월 0일</p>
<hr>
<h3>✅ 금일 진행 업무</h3>
<ul>
<li><input type="checkbox" checked> 업무 1</li>
<li><input type="checkbox"> 업무 2</li>
</ul>
<h3>📅 익일 계획</h3>
<ul>
<li>계획 1</li>
</ul>
<h3>❗ 이슈 및 특이사항</h3>
<p>없음</p>`
  },
  {
    id: 'weekly',
    title: '📅 주간 업무 보고',
    description: '주간 업무 성과와 차주 계획을 보고하는 서식입니다.',
    content: `<h1>📅 주간 업무 보고</h1>
<p><strong>기간:</strong> 2024년 0월 0일 ~ 0월 0일</p>
<hr>
<h3>✅ 금주 주요 실적</h3>
<ul>
<li>실적 1</li>
<li>실적 2</li>
</ul>
<h3>🚧 진행 중인 업무</h3>
<ul>
<li>업무 1</li>
</ul>
<h3>📅 차주 계획</h3>
<ul>
<li>계획 1</li>
</ul>
<h3>❗ 이슈 및 특이사항</h3>
<p>없음</p>`
  },
  {
    id: 'idea',
    title: '💡 아이디어 스케치',
    description: '새로운 아이디어의 목표와 기대 효과를 구체화하는 서식입니다.',
    content: `<h1>💡 아이디어 스케치</h1>
<hr>
<h3>🎯 목표/문제 정의</h3>
<p>해결하고자 하는 문제는 무엇인가요?</p>
<h3>🧠 아이디어 내용</h3>
<p>자유롭게 기술하세요.</p>
<h3>✨ 기대 효과</h3>
<ul>
<li>효과 1</li>
</ul>
<h3>📝 참고 자료</h3>
<p>링크 등</p>`
  },
  {
    id: 'todo',
    title: '✅ 체크리스트',
    description: '단순한 할 일 목록을 관리하기 위한 서식입니다.',
    content: `<h1>✅ 체크리스트</h1>
<hr>
<ul>
<li><input type="checkbox"> 할 일 1</li>
<li><input type="checkbox"> 할 일 2</li>
<li><input type="checkbox"> 할 일 3</li>
</ul>`
  }
];