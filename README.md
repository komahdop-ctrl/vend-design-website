# VEND DESIGN

Официальный сайт: https://vend-design.ru/

Индивидуальный дизайн, редизайн и оклейка кофейных и вендинговых автоматов.

Текущая схема публикации — GitHub Pages. Основной домен зарегистрирован
в Beget; подготовлен план переноса самого сайта на Beget.

- Проверки и открытые пункты: [docs/BETA_READINESS.md](docs/BETA_READINESS.md).
- Закрытая бета и перенос: [DEPLOYMENT_BEGET.md](DEPLOYMENT_BEGET.md).
- Тесты: `npm ci --ignore-scripts`, `npx playwright install --with-deps chromium`, `npm test`.
- Архив беты: `python3 scripts/build_public.py --mode beta --output dist/beta --zip`.

Пуш в `main` запускает публикацию GitHub Pages; рабочие исправления
проверять в PR до решения о выпуске. Архивы и снимки проверки PR сохраняются
в артефактах workflow `Beta checks`.

© VEND DESIGN, 2026.
