# betocampoy/champs-frontend

Pacote Composer que centraliza **templates Twig compartilhados** e o **micro-framework JavaScript `champs-core-js`** para uso em projetos Symfony e projetos PHP legados com Twig.

A ideia central é eliminar a necessidade de escrever JavaScript customizado para os comportamentos de interface mais comuns, usando apenas atributos `data-champs-*` no HTML.

---

## Índice

- [O que o pacote entrega](#o-que-o-pacote-entrega)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração no Symfony](#configuração-no-symfony)
- [Configuração no legado](#configuração-no-legado)
- [Publicação dos assets](#publicação-dos-assets)
- [Templates Twig disponíveis](#templates-twig-disponíveis)
  - [UI](#ui)
  - [Lista](#lista)
- [Módulos JavaScript](#módulos-javascript)
- [PHP: AjaxFormResponse](#php-ajaxformresponse)
- [Solução de problemas](#solução-de-problemas)
- [Licença](#licença)

---

## O que o pacote entrega

| O que | Onde fica | Como usar |
|---|---|---|
| Templates Twig compartilháveis | `vendor/.../templates/` | Namespace `@ChampsFrontend` |
| Micro-framework JS (`champs-core-js`) | `assets/champs-core-js/` | Publicar e importar via `init.js` |
| Bootstrap simples para legado | `src/LegacyBootstrap.php` | `LegacyBootstrap::createRenderer(...)` |
| Construtor de respostas AJAX | `src/Response/AjaxFormResponse.php` | `AjaxFormResponse::make()->...->toJson()` |
| Script de publicação de assets | `bin/champs-frontend-publish-assets` | `composer run champs-frontend-publish-assets` |

---

## Requisitos

- PHP 8.1+
- `twig/twig` ^2.12 ou ^3.0
- **Bootstrap 5** (peer dependency — o projeto consumidor é responsável por instalar)
- Bootstrap Icons (opcional, mas usado pelos componentes Twig de formulário)

---

## Instalação

```bash
composer require betocampoy/champs-frontend
```

---

## Configuração no Symfony

### 1. Registrar o namespace Twig

Abra `config/packages/twig.yaml` e adicione:

```yaml
twig:
    default_path: '%kernel.project_dir%/templates'
    paths:
        '%kernel.project_dir%/vendor/betocampoy/champs-frontend/templates': ChampsFrontend
```

Após qualquer alteração no `twig.yaml`, limpe o cache:

```bash
php bin/console cache:clear
```

### 2. Publicar os assets para `assets/`

```bash
composer run champs-frontend-publish-assets
```

Isso copia os arquivos para `assets/vendor/champs-frontend/`.

### 3. Incluir CSS e JS no template base

```twig
<link rel="stylesheet" href="{{ asset('vendor/champs-frontend/champs-core-js/src/styles/champs-core-js.css') }}">
<script type="module" src="{{ asset('app.js') }}"></script>
```

### 4. Criar ou ajustar `assets/app.js`

```js
import { initCore } from './vendor/champs-frontend/champs-core-js/src/init.js';
import Loader from './vendor/champs-frontend/champs-core-js/src/modules/Loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initCore(document);
    Loader.useTemplate('minimal'); // ou 'spinner', 'bar', etc.
});
```

### 5. Usar componentes nos templates

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}

<div class="row g-3">
    {{ ui.input({ col: 'col-12 col-md-6', label: 'Nome', name: 'name', value: user.name|default('') }) }}
    {{ ui.button({ classes: 'btn btn-primary', icon: 'bi-check2', label: 'Salvar' }) }}
</div>
```

---

## Configuração no legado

Use a classe `LegacyBootstrap` para montar o renderer Twig. Ela registra automaticamente:

- a pasta de templates do projeto
- o namespace `@ChampsFrontend`
- a extension com as funções `path()` e `asset()`

### Bootstrap do renderer

```php
use BetoCampoy\Champs\Frontend\LegacyBootstrap;

$renderer = LegacyBootstrap::createRenderer(
    projectTemplatesPath: __DIR__ . '/templates',
    routes: [
        'home'       => '/index.php',
        'users_list' => '/users/list.php',
    ],
    cachePath:   __DIR__ . '/var/cache/twig',
    debug:       true,
    basePath:    '',
    assetsBase:  '/vendor/champs-frontend',
    globals: [
        'app_name' => 'Minha Aplicação',
    ]
);

echo $renderer->render('pages/home.html.twig', ['title' => 'Home']);
```

### Publicar os assets no legado

```bash
php vendor/bin/champs-frontend-publish-assets public/vendor/champs-frontend
```

### Incluir CSS e JS no HTML

```html
<link rel="stylesheet" href="/vendor/champs-frontend/champs-core-js/src/styles/champs-core-js.css">
<script type="module" src="/vendor/champs-frontend/champs-core-js/src/init.js"></script>
```

Se o projeto tiver um `app.js` próprio, siga o mesmo padrão do Symfony e importe a partir dele.

---

## Publicação dos assets

O navegador não acessa arquivos dentro de `vendor/`, então os assets precisam ser copiados.

| Projeto | Destino padrão | Comando |
|---|---|---|
| Symfony | `assets/vendor/champs-frontend` | `composer run champs-frontend-publish-assets` |
| Legado | `public/vendor/champs-frontend` | `php vendor/bin/champs-frontend-publish-assets public/vendor/champs-frontend` |

O destino pode ser qualquer caminho: `php vendor/bin/champs-frontend-publish-assets <destino>`.

---

## Templates Twig disponíveis

Os templates ficam na `vendor/` e são acessados pelo namespace `@ChampsFrontend`. Você **não precisa copiá-los** para o seu projeto.

### UI

#### `_form.html.twig` — macros de formulário

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}
```

| Macro | Descrição |
|---|---|
| `ui.input(options)` | Campo de formulário Bootstrap (`<div class="col"> + <input>`) |
| `ui.button(options)` | Botão Bootstrap padrão |
| `ui.ajaxButton(options)` | Botão com submissão AJAX via `data-champs-ajax` |
| `ui.attrs(map)` | Renderiza um mapa como atributos HTML |

**Exemplo — input:**

```twig
{{ ui.input({
    col: 'col-12 col-md-6',
    label: 'E-mail',
    name: 'email',
    type: 'email',
    value: user.email|default(''),
    required: true
}) }}
```

**Exemplo — botão AJAX:**

```twig
{{ ui.ajaxButton({
    classes: 'btn btn-primary btn-sm',
    icon: 'bi-check2',
    label: 'Gravar',
    route: path('users_save'),
    withInputs: true,
    fields: { action: 'save' }
}) }}
```

---

#### `_modal.html.twig` — modais Bootstrap

```twig
{% import '@ChampsFrontend/components/ui/_modal.html.twig' as modal %}
```

**Exemplo — modal com formulário:**

```twig
{% set body %}
    <div class="row g-3">
        {{ ui.input({ col: 'col-12', label: 'Descrição', name: 'description' }) }}
    </div>
{% endset %}

{% set footer %}
    {{ ui.button({ classes: 'btn btn-primary', label: 'Salvar' }) }}
{% endset %}

{{ modal.formModal({
    title: 'Novo registro',
    body: body,
    footer: footer,
    dialogClasses: 'modal-lg'
}) }}
```

---

#### `_card.html.twig` — card Bootstrap

```twig
{% include '@ChampsFrontend/components/ui/_card.html.twig' with {
    header: 'Resumo',
    body: '<p class="mb-0">Conteúdo do card.</p>'
} only %}
```

---

#### `_notification_center.html.twig` — central de notificações

```twig
{% include '@ChampsFrontend/components/ui/_notification_center.html.twig' %}
```

---

### Lista

Templates para construção de páginas de listagem.

| Template | Descrição |
|---|---|
| `_page_header.html.twig` | Cabeçalho da página com título e subtítulo |
| `_search_collapse.html.twig` | Filtro de busca colapsável |
| `_list_content.html.twig` | Container genérico de lista |
| `_pager.html.twig` | Paginação |
| `_empty.html.twig` | Estado vazio (sem registros) |
| `table/_table.html.twig` | Exibição em tabela |
| `grid/_grid.html.twig` | Exibição em grid |

**Exemplo — cabeçalho:**

```twig
{% include '@ChampsFrontend/components/list/_page_header.html.twig' with {
    title: 'Usuários',
    subtitle: 'Lista de usuários cadastrados no sistema'
} only %}
```

---

## Módulos JavaScript

O `champs-core-js` é um micro-framework JavaScript puro (sem dependências externas) com módulos independentes ativados por atributos `data-champs-*`.

Para referência completa de todos os atributos disponíveis, consulte [`assets/champs-core-js/DATA-DICTIONAIRE.md`](assets/champs-core-js/DATA-DICTIONAIRE.md).

Para documentação detalhada de cada módulo, consulte [`assets/champs-core-js/README.md`](assets/champs-core-js/README.md).

### Resumo dos módulos

| Módulo | Arquivo | Responsabilidade |
|---|---|---|
| `AjaxForm` | `modules/AjaxForm.js` | Submissão AJAX declarativa e pipeline de actions |
| `DomPatch` | `modules/DomPatch.js` | Manipulação de DOM via actions do backend |
| `ActionRules` | `modules/ActionRules.js` | Regras condicionais declarativas na UI |
| `InputSanitize` | `modules/InputSanitize.js` | Normalização de entradas de texto |
| `InputMask` | `modules/InputMask.js` | Máscaras de input (telefone, CPF, data, etc.) |
| `Validate` | `modules/Validate.js` | Validação de CPF, CNPJ e Inscrição Estadual |
| `ValidationError` | `modules/ValidationError.js` | Exibição de erros de validação do backend |
| `ZipcodeSearch` | `modules/ZipcodeSearch.js` | Busca de CEP via ViaCEP com autopreenchimento |
| `VisibilityToggle` | `modules/VisibilityToggle.js` | Exibir/ocultar campos sensíveis |
| `CheckboxGroup` | `modules/CheckboxGroup.js` | Seleção em grupo, contador e soma |
| `CopyText` | `modules/CopyText.js` | Copiar texto para a área de transferência |
| `FormPopulation` | `modules/FormPopulation.js` | Preencher selects/inputs dinamicamente |
| `FormFiller` | `modules/FormFiller.js` | Preenchimento em massa de campos |
| `RemoteSelect` | `modules/RemoteSelect.js` | Popula selects a partir de API remota |
| `DatalistManager` | `modules/DatalistManager.js` | Autocomplete com datalist |
| `ModalManager` | `modules/ModalManager.js` | Wrapper para modais Bootstrap 5 |
| `AutoOpen` | `modules/AutoOpen.js` | Abertura automática de elementos no carregamento |
| `Loader` | `modules/Loader.js` | Indicador de carregamento |
| `Message` | `modules/Message.js` | Sistema de toast/mensagens globais |
| `NotificationCenter` | `modules/NotificationCenter.js` | Central de notificações in-app |
| `NavLoader` | `modules/NavLoader.js` | Loader durante navegação entre páginas |
| `TabsPersistence` | `modules/TabsPersistence.js` | Persistência da aba ativa (Bootstrap Tabs) |
| `FormSectionsPersistence` | `modules/FormSectionsPersistence.js` | Persistência de seções colapsadas |
| `PreferenceManager` | `modules/PreferenceManager.js` | Wrapper genérico para localStorage/sessionStorage |
| `ConsentManager` | `modules/ConsentManager.js` | Consentimento de cookies (LGPD) |
| `DynamicColspan` | `modules/DynamicColspan.js` | Colspan automático em tabelas |
| `Calc` | `modules/Calc.js` | Cálculos dinâmicos em formulários |
| `PushManager` | `modules/PushManager.js` | Notificações Push via Firebase FCM |

### Exemplos rápidos

**Máscara de input:**

```html
<input type="text" data-champs-mask="(99) 99999-9999" placeholder="Telefone">
```

**CEP com autopreenchimento:**

```html
<input type="text" data-champs-zipcode data-champs-zipcode-group="end1" placeholder="CEP">
<input type="text" data-champs-zipcode-field="street" data-champs-zipcode-group="end1">
<input type="text" data-champs-zipcode-field="city"   data-champs-zipcode-group="end1">
<input type="text" data-champs-zipcode-field="state"  data-champs-zipcode-group="end1">
```

**Copiar texto:**

```html
<span id="codigo">ABC-123</span>
<button data-champs-copy-from="#codigo">Copiar código</button>
```

**Consentimento LGPD:**

```html
<body
    data-champs-consent
    data-champs-consent-version="2026-01-01"
    data-champs-consent-policy-url="/privacidade"
    data-champs-consent-categories="analytics,marketing"
>
```

**Submissão AJAX (sem Twig):**

```html
<button
    data-champs-ajax
    data-champs-ajax-route="/api/salvar"
    data-champs-ajax-with-inputs="true"
    data-champs-ajax-field-action="save"
>
    Salvar
</button>
```

**Fila de submits (bipagem/scanner mais rápido que o round-trip):**

```html
<form data-champs-ajax-submit="true"
      data-champs-ajax-queue="true"
      data-champs-ajax-route="/api/processar">
    <input type="text" name="codigo" autofocus autocomplete="off">
</form>
```

Sem `data-champs-ajax-queue`, um submit disparado enquanto o anterior ainda
está em voo é simplesmente descartado. Com a fila ativada, cada submit tira
um snapshot dos campos na hora (o usuário já pode digitar/bipar o próximo
valor) e processa um item por vez, em ordem. A lib não desenha nenhuma UI —
cada tela ouve os 3 eventos e desenha sua própria lista "fila"/"processados":

```js
document.addEventListener('champs:ajax:queue:added', (e) => {
    // e.detail: { form, queueItemId, remaining, fieldValues }
    // renderizar o item na lista de "aguardando processamento"
});
document.addEventListener('champs:ajax:queue:start', (e) => {
    // e.detail: { form, queueItemId, remaining }
});
document.addEventListener('champs:ajax:queue:done', (e) => {
    // e.detail: { form, queueItemId, remaining }
    // remover o item da lista de "fila" (o resultado em si já chegou via
    // as actions normais da resposta — dom-patch/custom/message)
});
```

---

## PHP: AjaxFormResponse

Construtor fluente para montar a resposta JSON das actions do pipeline.

```php
use BetoCampoy\Champs\Frontend\Response\AjaxFormResponse;

$response = AjaxFormResponse::make()
    ->messageSuccess('Registro salvo com sucesso!')
    ->domPatchHtml(['target' => '#lista'], $html)
    ->redirect('/registros');

header('Content-Type: application/json');
echo $response->toJson();
```

### Actions disponíveis

| Método | Action gerada | Efeito no frontend |
|---|---|---|
| `messageSuccess($text)` | `message` | Toast de sucesso |
| `messageError($text)` | `message` | Toast de erro |
| `messageInfo($text)` | `message` | Toast informativo |
| `messageWarning($text)` | `message` | Toast de aviso |
| `validationError($fields)` | `validation-error` | Marca campos inválidos e interrompe o pipeline |
| `domPatchHtml($options, $html)` | `dom-patch` | Substitui/insere HTML no DOM |
| `redirect($url)` | `redirect` | Redireciona para URL e interrompe o pipeline |
| `reload()` | `reload` | Recarrega a página e interrompe o pipeline |
| `modal($options)` | `modal` | Abre um modal Bootstrap |
| `formfiller($data)` | `formfiller` | Preenche campos do formulário |
| `populate($data)` | `populate` | Popula selects/inputs filhos |
| `custom($function, $data)` | `custom` | Executa função global JavaScript customizada |

### Formato JSON da resposta

```json
{
    "actions": [
        { "type": "message", "level": "success", "text": "Salvo!" },
        { "type": "dom-patch", "operation": "replace", "target": "#item-1", "html": "<div>...</div>" },
        { "type": "redirect", "url": "/registros" }
    ]
}
```

### Actions terminais

As actions abaixo interrompem a execução do pipeline assim que são processadas:

- `validation-error`
- `redirect`
- `reload`

---

## PHP: Notificações Push (FcmClient)

O pacote fornece o **cliente JavaScript** (`PushManager.js`) e o **service worker** (`firebase-messaging-sw.js`) para captura e registro de tokens FCM no browser. O **envio server-side** fica a cargo do projeto consumidor usando `symfony/http-client` e a FCM HTTP v1 API.

### Pré-requisito

Baixe o JSON de credenciais do service account em:

> Firebase Console → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**

Salve o arquivo fora do repositório (ex.: `config/firebase/firebase-service-account.json`) e adicione-o ao `.gitignore`.

### Implementação recomendada no projeto consumidor (Symfony)

**1. Serviço de envio (`FcmClient.php`):**

```php
class FcmClient
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        string $serviceAccountPath,          // caminho para o JSON baixado
    ) { ... }

    // Envia para um token específico
    // $options: ['icon' => URL, 'link' => URL, 'data' => []]
    public function sendToToken(string $token, string $title, string $body, array $options = []): bool { ... }

    // Envia para todos os dispositivos de um usuário (remove tokens inválidos automaticamente)
    public function sendToUser(User $user, string $title, string $body, PushSubscriptionRepository $repo, array $options = []): int { ... }
}
```

**2. Entidade de persistência (`PushSubscription`):**

```php
// Um token por linha, vinculado ao usuário logado no momento do registro.
// Quando um usuário diferente loga no mesmo browser, o token é transferido (upsert por token único).
class PushSubscription
{
    private User $user;
    private string $token;      // único — um browser = um token
    private ?string $userAgent;
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $lastSeenAt;
}
```

**3. Endpoint de registro (controller):**

```php
// POST /push/registrar
public function register(Request $request, PushSubscriptionRepository $repo): JsonResponse
{
    $data = json_decode($request->getContent(), true) ?? [];
    if ($token = $data['token'] ?? null) {
        $repo->upsert($this->getUser(), $token, $data['userAgent'] ?? null);
    }
    return new JsonResponse(['ok' => true]);
}
```

**4. Envio com ícone e link (exemplo):**

```php
$fcm->sendToUser($user, 'Tarefa pendente', 'Você tem 3 tarefas para hoje.', $repo, [
    'icon' => 'https://meusite.com/images/icon-192.png',
    'link' => 'https://meusite.com/agenda/todos',
]);
```

**5. Command para cron:**

```bash
php bin/console app:push:notificar \
  --titulo="Bom dia!" \
  --mensagem="Você tem tarefas pendentes para hoje." \
  --link="/agenda/todos"
```

---

## Solução de problemas

### `There are no registered paths for namespace "ChampsFrontend"`

O namespace não foi registrado no Twig. Para Symfony, verifique se `config/packages/twig.yaml` contém o `paths` correto e rode `php bin/console cache:clear`.

### Templates não encontrados após atualização do pacote

O Twig pode ter em cache uma versão antiga. Limpe o cache:

```bash
# Symfony
php bin/console cache:clear

# Legado (se usar cache)
rm -rf var/cache/twig/*
```

### Assets não atualizados após `composer update`

Repita o comando de publicação:

```bash
composer run champs-frontend-publish-assets
```

### O `initCore` não está inicializando os módulos

Verifique se:

1. O script usa `type="module"` no HTML
2. O `initCore(document)` é chamado dentro do evento `DOMContentLoaded`
3. O caminho para `init.js` está correto após a publicação dos assets

### Módulos JS não reagem a elementos inseridos dinamicamente

O `initCore` precisa ser chamado novamente passando o container do novo conteúdo:

```js
import { initCore } from './vendor/champs-frontend/champs-core-js/src/init.js';

// Após inserir novo HTML no DOM:
initCore(document.querySelector('#meu-container'));
```

---

## Observações gerais

- O pacote **não impõe template base**. Use `{% include %}` e `{% import %}` nos layouts já existentes no seu projeto.
- O Twig **não exige** copiar os templates — eles são lidos diretamente da `vendor/` pelo namespace.
- Os assets JS/CSS **precisam** ser copiados porque o navegador não acessa `vendor/`.
- Os paths diferem por contexto: Symfony usa `assets/vendor/champs-frontend`, legado usa `public/vendor/champs-frontend`.

---

## Licença

MIT — [Beto Campoy](https://github.com/betocampoy)
