# ⌨️ Let's Git it!

> **Git 명령어를 몸으로 익히는 실시간 타이핑 디펜스 게임**

<div align="center">

[![Period](https://img.shields.io/badge/Period-2026.04.06%20~%2005.20-brightgreen)](https://github.com/)
[![Team](https://img.shields.io/badge/Team-BE%203%20%7C%20FE%203-blue)](https://github.com/)
[![Users](https://img.shields.io/badge/Total%20Users-524명-orange)](https://github.com/)
[![Status](https://img.shields.io/badge/Status-MVP%20완료-success)](https://github.com/)

### 🚀 Play Now

**https://lets-git-it.kr**

</div>

---

## 🚀 프로젝트 개요

**Let's Git it!**은 Git 명령어를 위에서 떨어지는 오브젝트로 표현하고 플레이어가 이를 직접 타이핑하며 처리하는 실시간 학습 게임입니다.

입력한 명령어는 브랜치 그래프로 실시간 시각화되며 플레이어는 게임을 진행하는 과정에서 자연스럽게 Git 워크플로우를 익히게 됩니다.

기존 Git 학습 도구가 개념 이해에 집중한다면 Let's Git it!은 반복 입력을 통한 **근육 기억(Muscle Memory)** 형성에 집중합니다.

---

## 🤔 왜 만들었을까요?

SSAFY 교육생 설문 결과 Git 학습 과정에서 다음과 같은 어려움이 확인되었습니다.

| 어려움 항목              | 응답률   |
| ------------------- | ----- |
| 팀 협업 시 충돌 관리        | 61.3% |
| Merge와 Rebase 차이 이해 | 48.4% |
| 명령어 암기              | 35.5% |

Git이 어려운 이유는 크게 세 가지입니다.

### 😨 심리적 부담감

* 터미널 환경이 낯설다
* 잘못 입력하면 프로젝트가 망가질 것 같은 불안감

### 🤯 구조적 복잡도

* 브랜치 흐름이 머릿속에 그려지지 않는다
* Conflict 발생 원인을 이해하기 어렵다

### 📖 학습 방식의 한계

* 명령어를 암기해야 한다
* 문서와 강의만으로는 실습 경험이 부족하다

Let's Git it!은 이러한 문제를 게임으로 해결하고자 시작되었습니다.

---

## ✨ 차별성

| 구분     | Git 강의     | Learn Git Branching | Let's Git it! |
| ------ | ---------- | ------------------- | ------------- |
| 학습 방식  | 영상 시청 + 실습 | 단계별 튜토리얼            | 실시간 타이핑 게임    |
| 핵심 목표  | 개념 이해      | 브랜치 구조 이해           | 명령어 체득        |
| 인터랙션   | 낮음         | 중간                  | 높음            |
| 랭킹 시스템 | ❌          | ❌                   | ✅             |
| 멀티플레이  | ❌          | ❌                   | ✅             |

읽고 이해하는 것과 손이 먼저 움직이는 것은 다릅니다.

Let's Git it!은 Git 명령어를 반복 입력하며 자연스럽게 익히는 경험을 제공합니다.

---

## 🐱 스토리

> 집사가 자리를 비운 사이 사고가 터졌다.

츄르를 먹지 못한 고양이가 집사를 도와 코드를 작성하던 중 실수를 저질렀고 개발자는 노트북 속으로 빨려 들어가게 됩니다.

플레이어는 Git 명령어를 활용해 프로젝트를 완성하고 현실 세계로 탈출해야 합니다.

### 등장인물

* 👨‍💻 플레이어 : 노트북 속에 갇힌 개발자
* 🐱 조력자 : 사고를 친 고양이
* 🎯 목표 : Git으로 프로젝트를 완성하고 현실 세계로 복귀

---

## 🎮 주요 기능

|     | 기능                 | 설명                                                                              |
| :-: | :----------------- | :------------------------------------------------------------------------------ |
|  🎮 | **싱글 모드**          | Easy / Normal / Hard 난이도로 Git 명령어를 단계적으로 학습합니다. 게임 종료 후 최종 브랜치 그래프를 확인할 수 있습니다. |
|  ⚔️ | **기여도 뺏기** | 2~4인이 명령어를 먼저 입력해 기여도를 획득합니다. 실시간 경쟁을 통해 Git 입력 속도와 정확도를 높입니다.                  |
|  ⏱️ | **타임어택**   | 제한 시간 동안 더 많은 커밋을 Main 브랜치에 Push한 플레이어가 승리합니다. Conflict 공격과 방어 미니게임이 포함됩니다.     |
|  🤝 | **협력 모드**          | 4인이 함께 명령어 순서를 기억하고 입력해 목표 브랜치 구조를 완성합니다.                                       |
|  📖 | **명령어 도감**         | 게임 중 획득한 Git 명령어와 사용법을 확인할 수 있습니다.                                              |
|  🏆 | **랭킹 시스템**         | 난이도별 점수와 협력 모드 기록을 기반으로 사용자 랭킹을 제공합니다.                                          |
|  🎨 | **캐릭터 커스터마이징**     | 머리 스타일, 의상, 색상 등을 변경해 자신만의 캐릭터를 꾸밀 수 있습니다.                                      |

---

<!--
## 📸 서비스 화면

### 메인 화면
![main](./docs/main.gif)

### 싱글 모드
![single](./docs/single.gif)

### 경쟁 모드
![battle](./docs/battle.gif)

### 협력 모드
![coop](./docs/coop.gif)
-->

---

## 🛠️ Tech Stack

### Backend

<img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white"> <img src="https://img.shields.io/badge/Spring%20Boot-3.5.13-6DB33F?style=for-the-badge&logo=springboot&logoColor=white"> <img src="https://img.shields.io/badge/Spring%20Security-JWT-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white"> <img src="https://img.shields.io/badge/JPA%20%2F%20Hibernate-59666C?style=for-the-badge&logo=hibernate&logoColor=white"> <img src="https://img.shields.io/badge/QueryDSL-0769AD?style=for-the-badge"> <img src="https://img.shields.io/badge/WebSocket-STOMP-010101?style=for-the-badge"> <img src="https://img.shields.io/badge/Swagger-SpringDoc-85EA2D?style=for-the-badge&logo=swagger&logoColor=black">

### Frontend

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"> <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white"> <img src="https://img.shields.io/badge/Phaser-4-8CC500?style=for-the-badge"> <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white"> <img src="https://img.shields.io/badge/Zustand-433E38?style=for-the-badge"> <img src="https://img.shields.io/badge/Jotai-000000?style=for-the-badge"> <img src="https://img.shields.io/badge/TanStack%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white"> <img src="https://img.shields.io/badge/TanStack%20Router-FF4154?style=for-the-badge">

### Database & Cache

<img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white"> <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white"> <img src="https://img.shields.io/badge/Redisson-DistributedLock-DC382D?style=for-the-badge&logo=redis&logoColor=white">

### Infra & Monitoring

<img src="https://img.shields.io/badge/AWS%20Lightsail-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white"> <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"> <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white"> <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white"> <img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white"> <img src="https://img.shields.io/badge/Sentry-362D59?style=for-the-badge&logo=sentry&logoColor=white">

---

## 🎁 게임 요소

### Git 아이템 시스템

| 아이템         | Git 개념   | 효과                  |
| ----------- | -------- | ------------------- |
| Stash       | 임시 저장    | 떨어지는 명령어를 잠시 멈춤     |
| Cherry-pick | 특정 커밋 선택 | 고양이가 필요한 명령어를 대신 처리 |
| Restore     | 변경 사항 복구 | 체력 회복               |

### Conflict 미니게임

Hard 모드와 멀티플레이에서 Conflict가 발생하면 방향키 입력 미니게임이 시작됩니다.

Conflict를 단순한 오류가 아닌 게임 요소로 경험할 수 있도록 설계했습니다.

---

## 🎯 기대 효과

| 대상         | 기대 효과                  |
| ---------- | ---------------------- |
| Git 입문자    | 반복 입력을 통한 자연스러운 명령어 학습 |
| 팀 프로젝트 준비생 | 협업 흐름 및 Conflict 대응 경험 |
| 교육 기관      | Git 교육 보조 도구           |
| 개발자 커뮤니티   | 랭킹 경쟁 및 협력 플레이         |

Git을 외워서 사용하는 것이 아니라 플레이하는 과정에서 자연스럽게 익히는 경험을 만드는 것이 목표입니다.
