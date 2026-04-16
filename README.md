# betocampoy/champs-frontend

Pacote para centralizar duas coisas que trabalham juntas:

- templates Twig compartilhados
- `champs-core-js` e seus assets

Ele foi pensado para uso tanto em projetos **Symfony** quanto em projetos **legados com Twig**.

## O que o pacote entrega

- componentes Twig compartilháveis, acessados via namespace `@ChampsFrontend`
- bootstrap simples para legado com `LegacyBootstrap::createRenderer(...)`
- pasta `assets/champs-core-js` pronta para ser copiada para o projeto consumidor
- script de publicação de assets

## Dependências

No mínimo:

```bash
composer require twig/twig
```

Em geral o projeto também precisa de:

- Bootstrap 5
- opcionalmente Bootstrap Icons

O pacote **não instala Bootstrap 5** para você. O projeto consumidor continua responsável por isso.

## Instalação

```bash
composer require betocampoy/champs-frontend
```

---

## Como os templates funcionam

Os templates do pacote **ficam na `vendor`**. Eles **não precisam ser copiados** para a pasta `templates` do seu projeto.

Você acessa os templates usando o namespace Twig:

```twig
@ChampsFrontend
```

Exemplos:

```twig
{% include '@ChampsFrontend/components/ui/_card.html.twig' %}
```

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}
```

```twig
{% import '@ChampsFrontend/components/ui/_modal.html.twig' as modal %}
```

---

## Publicação dos assets

O navegador não consegue ler arquivos dentro de `vendor`, então os assets do `champs-core-js` precisam ser copiados para o projeto consumidor.

### Opção recomendada para Symfony

Copiar para `assets/vendor/champs-frontend`:

```bash
php vendor/bin/champs-frontend-publish-assets assets/vendor/champs-frontend
```

Ou pelo script do Composer:

```bash
composer run champs-frontend-publish-assets
```

Esse script do Composer copia para:

```text
assets/vendor/champs-frontend
```

### Opção recomendada para legado

Copiar para `public/vendor/champs-frontend`:

```bash
php vendor/bin/champs-frontend-publish-assets public/vendor/champs-frontend
```

---

## Uso no Symfony

### 1. Registrar os templates do pacote no Twig

Abra `config/packages/twig.yaml` e adicione:

```yaml
twig:
    default_path: '%kernel.project_dir%/templates'
    paths:
        '%kernel.project_dir%/vendor/betocampoy/champs-frontend/templates': ChampsFrontend
```

Depois disso, seus templates do projeto já podem usar o namespace `@ChampsFrontend`.

### 2. Publicar os assets para `assets/`

```bash
php vendor/bin/champs-frontend-publish-assets assets/vendor/champs-frontend
```

### 3. Incluir o CSS do `champs-core-js`

No template base do projeto:

```twig
<link rel="stylesheet" href="{{ asset('vendor/champs-frontend/champs-core-js/src/styles/champs-core-js.css') }}">
<script type="module" src="{{ asset('app.js') }}"></script>
```

### 4. Criar ou ajustar o `assets/app.js`

Exemplo recomendado:

```js
import { initCore } from './vendor/champs-frontend/champs-core-js/src/init.js';
import Loader from './vendor/champs-frontend/champs-core-js/src/modules/Loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initCore(document);

    // Escolha o template que fizer sentido no projeto
    Loader.useTemplate('minimal');
});
```

### 5. Usar os componentes Twig no projeto

Exemplo simples de uso de macros de formulário:

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}

<div class="row g-3">
    {{ ui.input({
        col: 'col-12 col-md-6',
        label: 'Nome',
        name: 'name',
        value: user.name|default('')
    }) }}

    {{ ui.button({
        classes: 'btn btn-primary',
        icon: 'bi-check2',
        label: 'Salvar'
    }) }}
</div>
```

Exemplo com botão AJAX:

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}

{{ ui.ajaxButton({
    classes: 'btn btn-primary btn-sm',
    icon: 'bi-check2',
    label: 'Gravar',
    route: path('users_save'),
    withInputs: true,
    fields: {
        action: 'save'
    }
}) }}
```

Exemplo com modal:

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}
{% import '@ChampsFrontend/components/ui/_modal.html.twig' as modal %}

{% set body %}
    <div class="row g-3">
        {{ ui.input({
            col: 'col-12',
            label: 'Descrição',
            name: 'description'
        }) }}
    </div>
{% endset %}

{% set footer %}
    {{ ui.button({
        classes: 'btn btn-primary',
        label: 'Salvar'
    }) }}
{% endset %}

{{ modal.formModal({
    title: 'Novo registro',
    body: body,
    footer: footer,
    dialogClasses: 'modal-lg'
}) }}
```

Exemplo com card:

```twig
{% include '@ChampsFrontend/components/ui/_card.html.twig' with {
    header: 'Resumo',
    body: '<p class="mb-0">Conteúdo do card.</p>'
} only %}
```

Exemplo com listagem:

```twig
{% include '@ChampsFrontend/components/list/_page_header.html.twig' with {
    title: 'Usuários',
    subtitle: 'Lista cadastrada no sistema'
} only %}
```

---

## Uso no legado

No legado, o caminho recomendado é usar a classe `LegacyBootstrap`. Ela já:

- cria o renderer Twig
- registra a pasta de templates do projeto
- registra os templates do pacote como `@ChampsFrontend`
- adiciona a extension com `path()` e `asset()`
- permite passar rotas, globals e configuração básica

### Exemplo de bootstrap

```php
use BetoCampoy\Champs\Frontend\LegacyBootstrap;

$renderer = LegacyBootstrap::createRenderer(
    projectTemplatesPath: __DIR__ . '/templates',
    routes: [
        'home' => '/index.php',
        'users_list' => '/users/list.php',
    ],
    cachePath: __DIR__ . '/var/cache/twig',
    debug: true,
    basePath: '',
    assetsBase: '/vendor/champs-frontend',
    globals: [
        'app_name' => 'Minha Encomenda',
    ]
);

echo $renderer->render('pages/teste.html.twig', [
    'title' => 'Exemplo',
]);
```

### Exemplo de template no legado

```twig
{% import '@ChampsFrontend/components/ui/_form.html.twig' as ui %}

<h1>{{ title }}</h1>

<div class="row g-3">
    {{ ui.input({
        col: 'col-12 col-md-6',
        label: 'Nome',
        name: 'name'
    }) }}
</div>
```

### Assets no legado

Publique para `public/`:

```bash
php vendor/bin/champs-frontend-publish-assets public/vendor/champs-frontend
```

Depois inclua os arquivos no HTML/layout do legado:

```html
<link rel="stylesheet" href="/vendor/champs-frontend/champs-core-js/src/styles/champs-core-js.css">
<script type="module" src="/vendor/champs-frontend/champs-core-js/src/init.js"></script>
```

Se o projeto tiver um `app.js` próprio, você também pode seguir a mesma ideia do Symfony e importar os módulos a partir dele.

---

## Estrutura de templates disponível

### UI

- `@ChampsFrontend/components/ui/_form.html.twig`
- `@ChampsFrontend/components/ui/_modal.html.twig`
- `@ChampsFrontend/components/ui/_card.html.twig`

### Lista

- `@ChampsFrontend/components/list/_empty.html.twig`
- `@ChampsFrontend/components/list/_list_content.html.twig`
- `@ChampsFrontend/components/list/_page_header.html.twig`
- `@ChampsFrontend/components/list/_pager.html.twig`
- `@ChampsFrontend/components/list/_search_collapse.html.twig`
- `@ChampsFrontend/components/list/table/_table.html.twig`
- `@ChampsFrontend/components/list/grid/_grid.html.twig`

---

## Observações importantes

### 1. O pacote não impõe template base

Você **não precisa** estender um layout do pacote.

O uso esperado é:

- `include` para componentes
- `import` para macros
- integração no layout já existente do seu projeto

### 2. Symfony e legado podem usar caminhos diferentes para assets

Isso é intencional:

- Symfony: `assets/vendor/champs-frontend`
- legado: `public/vendor/champs-frontend`

### 3. Se alterar `twig.yaml` no Symfony

Limpe o cache:

```bash
php bin/console cache:clear
```

### 4. Se der erro de namespace Twig

Mensagem comum:

```text
There are no registered paths for namespace "ChampsFrontend"
```

Isso significa que o namespace ainda não foi registrado no Twig.

---

## Licença

MIT
