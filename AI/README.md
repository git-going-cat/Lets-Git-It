# Pro Git RAG API

Pro Git 2판 한국어판 기반 Git 질문 답변 서버.

## 빠른 시작

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일 열어서 API 키 입력

# 2. 연결 테스트 (가상환경)
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/test_connections.py

# 3. Docker로 서버 실행
docker compose up
```

## 모듈 문서

`docs/30_MODULES/AI/` 참고
