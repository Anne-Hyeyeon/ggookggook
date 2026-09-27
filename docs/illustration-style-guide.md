# 일러스트 제작 가이드

꾹꾹의 부위 그림과 전신 지도를 ChatGPT로 만드는 방법입니다.

## 스타일

- 모든 그림은 가는 먹선 선화입니다.
- 선 색은 `#3A3732`입니다.
- 면 채색, 음영, 빗금은 넣지 않습니다.
- 사람은 한국인 성인입니다.
- 근육 선, 핏줄, 힘줄은 그리지 않습니다.
- 몸통, 팔, 다리는 무늬 없는 바디슈트로 덮습니다.
- 손, 발, 얼굴, 목은 드러냅니다.
- 배경은 투명입니다.
- 혈자리 점은 그림에 넣지 않습니다. 앱이 코드로 올립니다.

## 프롬프트 뽑기

- 목록을 보려면 `npm run prompt -w @ggookggook/content`를 실행합니다.
- 특정 그림의 프롬프트는 `npm run prompt -w @ggookggook/content -- <id>`로 뽑습니다.
- 예를 들어 발바닥은 `-- foot-sole`입니다.
- 그림마다 다른 부분은 `content/data/plates.json`과 `maps.json`의 `subject` 한 줄뿐입니다.
- 스타일 문구를 바꾸려면 `content/src/prompt.ts`를 고칩니다.

## ChatGPT에서 만들기

- 프롬프트마다 새 채팅을 엽니다. 앞 그림의 스타일이 섞이지 않게 하기 위해서입니다.
- 손가락이나 발가락 개수가 틀리면 다시 생성합니다.
- ChatGPT는 투명 배경을 검은 바탕에 보여줍니다. 빛이 번진 것처럼 보여도 대부분 정상입니다.
- 사람을 그릴 때 안전 필터에 막히면 바디슈트 조건을 다시 강조합니다.

## 앱에 넣기

- 받은 파일 이름을 그림 id로 바꿉니다. 예를 들어 `foot-sole.png`입니다.
- 파일을 `content/images/raw/`에 넣습니다.
- `npm run images -w @ggookggook/content -- foot-sole`을 실행합니다.
- 결과는 `content/images/out/foot-sole.webp`로 나옵니다.
- `npm run pin -w @ggookggook/content`로 좌표 찍기 도구를 엽니다.
- 그림을 고르고 혈자리마다 위치를 찍습니다.
- 마지막으로 `npm run validate -w @ggookggook/content`로 빠진 좌표가 없는지 확인합니다.

## 그림을 교체할 때

- 같은 파일 이름으로 `raw`에 덮어쓰고 `images`를 다시 실행합니다.
- 그림이 바뀌면 좌표도 달라집니다. 좌표 찍기 도구에서 모든 점을 다시 찍습니다.
- `content/data/meta.json`의 `version`을 1 올립니다.

## 고양이 캐릭터

- 고양이는 콘텐츠 데이터가 아니라서 프롬프트 생성기에 없습니다.
- 스타일은 같은 먹선 선화이고, 인주색(`#C23B2A`)은 발바닥에만 씁니다.
- 1차 그림은 `content/images/raw/cat-shoulder.png`입니다.
- 1차 그림은 사람 어깨를 꾹꾹 누르는 고양이입니다.
