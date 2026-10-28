# Навыки ИИ-агентов для VEND DESIGN

Это **репозиторные Agent Skills**, а не изменение HTML сайта и не установка приложений в аккаунт ChatGPT. Размещены в `.agents/skills/` для совместимых агентов (Codex, GitHub Copilot и др.). Чтобы они стали доступны при работе с веткой `main`, изменения необходимо слить в `main`.

## Что установлено

| Навык | Для чего | Источник |
|---|---|---|
| `frontend-design` | Авторский дизайн и улучшение UI | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| `webapp-testing` | Playwright-проверки меню, форм, галереи и адаптивности | [Anthropic](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) |
| `systematic-debugging` | Поиск первопричины дефектов | [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) |
| `verification-before-completion` | Не считать изменения готовыми без свежих проверок | [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) |
| `vend-design-launch-audit` | Локальный чек-лист именно этого сайта и GitHub Pages | Создан для проекта VEND DESIGN |

## Безопасность и ограничения
- Источники получены как **текстовые файлы GitHub**, без выполнения удалённых `curl | bash` или `npx` инсталляторов.
- В комплекте сохранены лицензионные файлы: Apache-2.0 (Anthropic) и MIT (obra/superpowers).
- `webapp-testing` содержит файл `scripts/with_server.py`; это вспомогательный скрипт, **не запускаемый автоматически**. Он принимает команду локального сервера и выполняет её через shell: перед применением задавайте только доверенную, проверенную команду. Playwright и браузер устанавливаются отдельно в рабочем окружении.
- Навыки не дают дополнительных прав и не создают доступ к панели Beget или GitHub Pages. Они не доказывают готовность домена или сайта.
- Перед обновлением сторонних навыков повторно просматривайте их содержимое и условия лицензий.
- Намеренно не скопирован `vercel-labs/agent-skills/web-design-guidelines`: он автоматически запрашивает **изменяемые внешние инструкции** при каждом запуске; подходящие требования можно использовать после отдельной проверки и фиксации версии. [Исходник](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines).

## Применение
1. Работайте в репозитории, где видна папка `.agents/skills/`.
2. Попросите агента «Проверь готовность VEND DESIGN по навыку vend-design-launch-audit» или «Проверь форму и галерею по webapp-testing».
3. Вносите изменения маленькими проверяемыми итерациями; перед выпуском запрашивайте фактический отчёт о тестах, DNS, HTTPS и действиях пользователя.

Дата подготовки: 28 октября 2026 года.
