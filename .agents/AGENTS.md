
## Workflow and Quality Standard
After every major feature implementation, you MUST run the following commands and ensure they pass without errors before implementing the next feature:
- npm run lint
- npm run type-check
- npm run build

You must also test the affected pages to ensure there are no runtime errors. Never allow runtime errors to accumulate.
