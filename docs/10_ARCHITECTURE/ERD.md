-- =============================================
-- Let's Git it — ERD DDL v18
-- =============================================


-- =============================================
-- MEMBER
-- =============================================
CREATE TABLE member (
member_id            BINARY(16)      NOT NULL,
email                VARCHAR(255)    NOT NULL,
password             VARCHAR(255)    NULL,
provider             VARCHAR(50)     NULL     COMMENT 'LOCAL / GOOGLE',
provider_id          VARCHAR(255)    NULL,
nickname             VARCHAR(50)     NULL,
character_hair       VARCHAR(50)     NULL     COMMENT '헤어 스타일 ID',
character_hair_color VARCHAR(50)     NULL     COMMENT '헤어 색깔 ID',
character_body       VARCHAR(50)     NULL     COMMENT '바디 ID',
character_eye        VARCHAR(50)     NULL     COMMENT '눈 ID',
character_outfit     VARCHAR(50)     NULL     COMMENT '옷 ID',
character_outfit_color VARCHAR(50)     NULL     COMMENT '옷 색깔 ID',
git_proficiency      VARCHAR(50)     NULL     COMMENT 'NEVER_HEARD / HEARD_ONLY / LEARNED / PERSONAL / TEAM',
onboarding_status    VARCHAR(50)     NOT NULL DEFAULT 'NONE' COMMENT 'NONE / NICKNAME_SET_DONE / TUTORIAL_DONE',
total_play_time      INT             NOT NULL DEFAULT 0      COMMENT '총 플레이 시간 (초)',
created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
deleted_at           DATETIME        NULL,
PRIMARY KEY (member_id),
UNIQUE KEY uq_member_email    (email),
UNIQUE KEY uq_member_nickname (nickname)
);


-- =============================================
-- SINGLE_RESULT
-- =============================================
CREATE TABLE single_result (
single_result_id BINARY(16)   NOT NULL,
session_id       VARCHAR(100) NOT NULL COMMENT 'Redis 세션 ID 참조',
member_id        BINARY(16)   NOT NULL,
difficulty       VARCHAR(20)  NOT NULL COMMENT 'EASY / NORMAL / HARD',
status           VARCHAR(10)  NOT NULL COMMENT 'SUCCESS / GAMEOVER',          -- [추가]
score            INT          NOT NULL DEFAULT 0,
grade            VARCHAR(1)   NOT NULL COMMENT 'S / A / B / C / D',
play_time        INT          NULL     COMMENT '플레이 시간 (ms)',             -- [추가]
played_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (single_result_id),
UNIQUE KEY uq_single_result_session (session_id),
INDEX idx_single_result_member (member_id),
CONSTRAINT fk_single_result_member FOREIGN KEY (member_id) REFERENCES member (member_id),
CONSTRAINT chk_single_result_grade CHECK (grade IN ('S', 'A', 'B', 'C', 'D'))
);


-- =============================================
-- SINGLE_RANKING
-- =============================================
CREATE TABLE single_ranking (
single_ranking_id BINARY(16)  NOT NULL,
member_id         BINARY(16)  NOT NULL,
difficulty        VARCHAR(20) NOT NULL COMMENT 'EASY / NORMAL / HARD',
score             INT         NOT NULL DEFAULT 0,
grade             VARCHAR(1)  NULL     COMMENT 'S / A / B / C / D — 정산 시 미결정, 향후 업데이트',
rank              INT         NOT NULL,
play_time         INT         NULL     COMMENT '플레이 시간 (ms), playTime 도입 전 데이터는 NULL',
week              VARCHAR(10) NOT NULL COMMENT '예: 2025-04-3 (year-month-weekOfMonth)',
recorded_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (single_ranking_id),
UNIQUE KEY uq_single_ranking (member_id, difficulty, week),
INDEX idx_single_ranking_difficulty_week_rank (difficulty, week, rank),
CONSTRAINT fk_single_ranking_member FOREIGN KEY (member_id) REFERENCES member (member_id),
CONSTRAINT chk_single_ranking_grade CHECK (grade IN ('S', 'A', 'B', 'C', 'D'))
);

-- [마이그레이션] 기존 테이블에 컬럼 추가 시 실행
-- ALTER TABLE single_ranking ADD COLUMN play_time INT NULL COMMENT '플레이 시간 (ms), playTime 도입 전 데이터는 NULL' AFTER `rank`;

-- =============================================
-- CONTRIBUTION_RESULT (기여도 뺏기 게임 결과)
-- =============================================
CREATE TABLE contribution_result (
contribution_result_id BINARY(16)   NOT NULL,
room_id                BIGINT       NOT NULL COMMENT '대기방 ID',
session_id             VARCHAR(100) NOT NULL COMMENT '게임 세션 Redis ID',
played_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (contribution_result_id),
UNIQUE KEY uq_contribution_result_session (session_id)
);

-- =============================================
-- CONTRIBUTION_RESULT_MEMBER (기여도 뺏기 플레이어별 결과)
-- =============================================
CREATE TABLE contribution_result_member (
contribution_result_member_id BINARY(16) NOT NULL,
contribution_result_id        BINARY(16) NOT NULL,
member_id                     BINARY(16) NOT NULL,
contribution                  INT        NOT NULL COMMENT '최종 기여도 (%)',
rank                          INT        NOT NULL COMMENT '최종 순위',
PRIMARY KEY (contribution_result_member_id),
UNIQUE KEY uq_contribution_result_member (contribution_result_id, member_id),
INDEX idx_contribution_result_member_member (member_id),
CONSTRAINT fk_contribution_result_member_result
FOREIGN KEY (contribution_result_id)
REFERENCES contribution_result (contribution_result_id),
CONSTRAINT fk_contribution_result_member_member
FOREIGN KEY (member_id)
REFERENCES member (member_id)
);

-- =============================================
-- TIMEATTACK_RESULT (타임어택 게임 결과)
-- =============================================
CREATE TABLE timeattack_result (
timeattack_result_id BINARY(16)   NOT NULL,
room_id              BIGINT       NOT NULL COMMENT '대기방 ID',
session_id           VARCHAR(100) NOT NULL COMMENT '게임 세션 Redis ID',
played_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (timeattack_result_id),
UNIQUE KEY uq_timeattack_result_session (session_id)
);

-- =============================================
-- TIMEATTACK_RESULT_MEMBER (타임어택 플레이어별 결과)
-- =============================================
CREATE TABLE timeattack_result_member (
timeattack_result_member_id BINARY(16) NOT NULL,
timeattack_result_id        BINARY(16) NOT NULL,
member_id                   BINARY(16) NOT NULL,
total_count                 INT        NOT NULL COMMENT '최종 입력 명령어 수',
is_winner                   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '승리 여부',
PRIMARY KEY (timeattack_result_member_id),
UNIQUE KEY uq_timeattack_result_member (timeattack_result_id, member_id),
INDEX idx_timeattack_result_member_member (member_id),
CONSTRAINT fk_timeattack_result_member_result
FOREIGN KEY (timeattack_result_id)
REFERENCES timeattack_result (timeattack_result_id),
CONSTRAINT fk_timeattack_result_member_member
FOREIGN KEY (member_id)
REFERENCES member (member_id)
);


-- =============================================
-- COMPETITIVE_RANKING
-- =============================================
CREATE TABLE competitive_ranking (
competitive_ranking_id BINARY(16)  NOT NULL,
member_id              BINARY(16)  NOT NULL,
mode                   VARCHAR(50) NOT NULL COMMENT 'TIME_ATTACK / CONTRIBUTION',
score                  INT         NOT NULL DEFAULT 0,
rank                   INT         NOT NULL,
week                   VARCHAR(10) NOT NULL COMMENT '예: 2025-04-3 (year-month-weekOfMonth)'
recorded_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (competitive_ranking_id),
UNIQUE KEY uq_competitive_ranking (member_id, mode, week),
INDEX idx_competitive_ranking_mode_week_rank (mode, week, rank),
CONSTRAINT fk_competitive_ranking_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);


-- =============================================
-- COOP_MAP
-- =============================================
CREATE TABLE coop_map (
coop_map_id BINARY(16)   NOT NULL,
name        VARCHAR(100) NOT NULL COMMENT '맵 이름',
difficulty  VARCHAR(20)  NOT NULL COMMENT 'MAP_1 / MAP_2 / MAP_3 / MAP_4 / MAP_5',
is_active   TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '활성화 여부 (0: 비활성, 삭제 금지)',
PRIMARY KEY (coop_map_id)
);


-- =============================================
-- COOP_RESULT
-- =============================================
CREATE TABLE coop_result (
coop_result_id BINARY(16)   NOT NULL,
room_id        BIGINT       NOT NULL COMMENT '대기방 ID',
session_id     VARCHAR(100) NOT NULL COMMENT '게임 세션 Redis ID',
map_name       VARCHAR(100) NOT NULL COMMENT '플레이 시점 맵 이름 스냅샷',
map_difficulty VARCHAR(20)  NOT NULL COMMENT '플레이 시점 맵 난이도 스냅샷',
team_name      VARCHAR(100) NOT NULL COMMENT '대기방 입력 팀명 → 게임 종료 시 저장',
clear_time     INT          NOT NULL COMMENT '클리어 시간 (ms)',              -- [변경] 초 → ms
played_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (coop_result_id),
UNIQUE KEY uq_coop_result_session (session_id)
);


-- =============================================
-- COOP_RESULT_MEMBER
-- =============================================
CREATE TABLE coop_result_member (
coop_result_member_id BINARY(16) NOT NULL,
coop_result_id        BINARY(16) NOT NULL,
member_id             BINARY(16) NOT NULL,
PRIMARY KEY (coop_result_member_id),
UNIQUE KEY uq_coop_result_member (coop_result_id, member_id),
INDEX idx_coop_result_member_member (member_id),
CONSTRAINT fk_coop_result_member_result FOREIGN KEY (coop_result_id) REFERENCES coop_result (coop_result_id),
CONSTRAINT fk_coop_result_member_member FOREIGN KEY (member_id)       REFERENCES member (member_id)
);


-- =============================================
-- COOP_RANKING
-- =============================================
CREATE TABLE coop_ranking (
coop_ranking_id BINARY(16)   NOT NULL,
coop_result_id  BINARY(16)   NOT NULL,
map_name        VARCHAR(100) NOT NULL COMMENT '랭킹 기록 시점 맵 이름 스냅샷',
map_difficulty  VARCHAR(20)  NOT NULL COMMENT '랭킹 기록 시점 맵 난이도 스냅샷',
rank            INT          NOT NULL,
clear_time      INT          NOT NULL COMMENT '클리어 시간 (ms)',              -- [변경] 초 → ms
week            VARCHAR(10)  NOT NULL COMMENT '예: 2025-04-3 (year-month-weekOfMonth)'
recorded_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (coop_ranking_id),
UNIQUE KEY uq_coop_ranking (coop_result_id),
INDEX idx_coop_ranking_map_difficulty_week_rank (map_difficulty, week, rank),
CONSTRAINT fk_coop_ranking_result FOREIGN KEY (coop_result_id) REFERENCES coop_result (coop_result_id)
);


-- =============================================
-- MEMBER_BEST_RECORD
-- =============================================
CREATE TABLE member_best_record (
member_best_record_id BINARY(16)  NOT NULL,
member_id             BINARY(16)  NOT NULL,
mode                  VARCHAR(50) NOT NULL COMMENT 'SINGLE_EASY / SINGLE_NORMAL / SINGLE_HARD / TIME_ATTACK / CONTRIBUTION',
best_score            INT         NOT NULL DEFAULT 0,
best_rank             INT         NOT NULL COMMENT '해당 기록의 순위',
updated_at            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (member_best_record_id),
UNIQUE KEY uq_member_best_record (member_id, mode),
CONSTRAINT fk_member_best_record_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);


-- =============================================
-- MEMBER_COOP_BEST_RECORD
-- =============================================
CREATE TABLE member_coop_best_record (
member_coop_best_record_id BINARY(16)   NOT NULL,
member_id                  BINARY(16)   NOT NULL,
map_name                   VARCHAR(100) NOT NULL COMMENT '맵 이름 스냅샷',
map_difficulty             VARCHAR(20)  NOT NULL COMMENT '맵 난이도 스냅샷',
best_time                  INT          NOT NULL COMMENT '최고 클리어 시간 (ms)', -- [변경] 초 → ms
best_rank                  INT          NOT NULL COMMENT '해당 기록의 순위',
updated_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
PRIMARY KEY (member_coop_best_record_id),
UNIQUE KEY uq_member_coop_best_record (member_id, map_name, map_difficulty),
CONSTRAINT fk_member_coop_best_record_member FOREIGN KEY (member_id) REFERENCES member (member_id)
);


-- =============================================
-- DICTIONARY_COMMAND
-- =============================================
CREATE TABLE dictionary_command (
dictionary_command_id BINARY(16)   NOT NULL,
name                  VARCHAR(100) NOT NULL,
description           TEXT         NULL,
tip                   VARCHAR(500) NULL,
example               VARCHAR(500) NULL,
is_in_game            TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '게임 내 사용 여부',
PRIMARY KEY (dictionary_command_id)
);


-- =============================================
-- DICTIONARY_COMMAND_OPTION
-- =============================================
CREATE TABLE dictionary_command_option (
dictionary_command_option_id BINARY(16)   NOT NULL,
dictionary_command_id        BINARY(16)   NOT NULL,
option                       VARCHAR(100) NOT NULL COMMENT '예: m, amend',
description                  VARCHAR(500) NULL,
PRIMARY KEY (dictionary_command_option_id),
UNIQUE KEY uq_dictionary_command_option (dictionary_command_id, option),
CONSTRAINT fk_dictionary_command_option FOREIGN KEY (dictionary_command_id) REFERENCES dictionary_command (dictionary_command_id)
);


-- =============================================
-- SINGLE_COMMAND_SET
-- =============================================
CREATE TABLE single_command_set (
single_command_set_id BINARY(16)  NOT NULL,
set_number            INT         NOT NULL COMMENT '1 / 2 / 3',
difficulty            VARCHAR(20) NOT NULL COMMENT 'EASY / NORMAL / HARD',
PRIMARY KEY (single_command_set_id),
UNIQUE KEY uq_single_command_set (set_number, difficulty),
CONSTRAINT chk_single_command_set_difficulty
CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD'))
);


-- =============================================
-- SINGLE_COMMAND_SET_ITEM
-- =============================================
CREATE TABLE single_command_set_item (
single_command_set_item_id BINARY(16)   NOT NULL,
single_command_set_id      BINARY(16)   NOT NULL,
sequence                   INT          NOT NULL COMMENT '명령어 순서',
command_text               VARCHAR(255) NOT NULL COMMENT '명령어 텍스트',
branch_name                VARCHAR(100) NULL     COMMENT '명령어가 속한 브랜치명',
command_type               VARCHAR(10)  NOT NULL DEFAULT 'COMMON' COMMENT 'CREATE / MERGE / SWITCH / COMMON / CONFLICT',
PRIMARY KEY (single_command_set_item_id),
UNIQUE KEY uq_single_command_set_item (single_command_set_id, sequence),
CONSTRAINT fk_single_command_set_item FOREIGN KEY (single_command_set_id) REFERENCES single_command_set (single_command_set_id)
);


-- =============================================
-- COMPETITIVE_COMMAND_SET
-- =============================================
CREATE TABLE competitive_command_set (
competitive_command_set_id BINARY(16)  NOT NULL,
set_number                 INT         NOT NULL COMMENT '1 / 2 / 3',
mode                       VARCHAR(50) NOT NULL COMMENT 'CONTRIBUTION / TIME_ATTACK',
PRIMARY KEY (competitive_command_set_id),
UNIQUE KEY uq_competitive_command_set (set_number, mode),
CONSTRAINT chk_competitive_command_set_mode
CHECK (mode IN ('CONTRIBUTION', 'TIME_ATTACK'))
);


-- =============================================
-- COMPETITIVE_COMMAND_SET_ITEM
-- =============================================
CREATE TABLE competitive_command_set_item (
competitive_command_set_item_id BINARY(16)   NOT NULL,
competitive_command_set_id      BINARY(16)   NOT NULL,
sequence                        INT          NOT NULL COMMENT '명령어 순서',
command_text                    VARCHAR(255) NOT NULL COMMENT '명령어 텍스트',
branch_name                     VARCHAR(100) NULL     COMMENT '명령어가 속한 브랜치명',
PRIMARY KEY (competitive_command_set_item_id),
UNIQUE KEY uq_competitive_command_set_item (competitive_command_set_id, sequence),
CONSTRAINT fk_competitive_command_set_item FOREIGN KEY (competitive_command_set_id) REFERENCES competitive_command_set (competitive_command_set_id)
);


-- =============================================
-- COOP_COMMAND_SET
-- =============================================
CREATE TABLE coop_command_set (
coop_command_set_id BINARY(16) NOT NULL,
coop_map_id         BINARY(16) NOT NULL COMMENT '어떤 맵의 명령어 세트인지',
set_number          INT        NOT NULL COMMENT '1 / 2 / 3 (맵별 랜덤 시나리오)',
PRIMARY KEY (coop_command_set_id),
UNIQUE KEY uq_coop_command_set (coop_map_id, set_number),
CONSTRAINT fk_coop_command_set_map FOREIGN KEY (coop_map_id) REFERENCES coop_map (coop_map_id)
);


-- =============================================
-- COOP_COMMAND_SET_ITEM
-- =============================================
CREATE TABLE coop_command_set_item (
coop_command_set_item_id BINARY(16)   NOT NULL,
coop_command_set_id      BINARY(16)   NOT NULL,
round                    INT          NOT NULL COMMENT '라운드 번호 (1~5)',
sequence                 INT          NOT NULL COMMENT '라운드 내 입력 순서 (1~4)',
command_text             VARCHAR(255) NOT NULL COMMENT '명령어 텍스트',
PRIMARY KEY (coop_command_set_item_id),
UNIQUE KEY uq_coop_command_set_item (coop_command_set_id, round, sequence),
CONSTRAINT fk_coop_command_set_item_set FOREIGN KEY (coop_command_set_id) REFERENCES coop_command_set (coop_command_set_id)
);

-- =============================================
-- TUTORIAL_STEP
-- =============================================
CREATE TABLE tutorial_step (
tutorial_step_id BINARY(16)   NOT NULL,
step_order       INT          NOT NULL COMMENT '단계 순서 (1~13)',
title            VARCHAR(100) NOT NULL COMMENT '단계 제목',
description      VARCHAR(500) NOT NULL COMMENT '단계 설명',
PRIMARY KEY (tutorial_step_id),
UNIQUE KEY uq_tutorial_step_order (step_order)
);

-- =============================================
-- TUTORIAL_STEP_ITEM
-- =============================================
CREATE TABLE tutorial_step_item (
tutorial_step_item_id BINARY(16)   NOT NULL,
tutorial_step_id      BINARY(16)   NOT NULL,
sequence              INT          NOT NULL COMMENT '아이템 순서',
item_type             VARCHAR(20)  NOT NULL COMMENT 'COMMAND / DIALOGUE',
content               VARCHAR(255) NOT NULL COMMENT 'COMMAND: 명령어 텍스트 / DIALOGUE: 대사 텍스트',
explanation           VARCHAR(500) NULL     COMMENT 'COMMAND일 때만 사용, DIALOGUE면 NULL',
PRIMARY KEY (tutorial_step_item_id),
UNIQUE KEY uq_tutorial_step_item (tutorial_step_id, sequence),
CONSTRAINT chk_tutorial_step_item_type CHECK (item_type IN ('COMMAND', 'DIALOGUE')),
CONSTRAINT fk_tutorial_step_item_step FOREIGN KEY (tutorial_step_id) REFERENCES tutorial_step (tutorial_step_id)
);
