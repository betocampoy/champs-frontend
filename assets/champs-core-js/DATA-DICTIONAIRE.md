# ⚙️ Champs Core JS - Data Attributes Dictionary

Lista completa de todos os atributos `data-*` disponíveis e para que
servem.

------------------------------------------------------------------------

# 📥 Tabela de atributos (Ordem Alfabética por Módulo)

------------------------------------------------------------------------

## Modulo: AjaxForm

 Atributo                              | Função
|---------------------------------------|---
|  `data-champs-ajax`                   | Ativa requisição AJAX
|  `data-champs-ajax-confirm`           | Mensagem de confirmação
|  `data-champs-ajax-disable-button`    | Desabilita botão durante requisição
| `data-champs-ajax-field-\*`           | Campos adicionais enviados no payload
| `data-champs-ajax-form`               | Nome do form associado
| `data-champs-ajax-priorize-data-attr` | Prioriza data-attr sobre form
| `data-champs-ajax-route`              | URL da requisição
| `data-champs-ajax-trigger`            | Evento disparador
| `data-champs-ajax-with-inputs`        | Envia inputs do elemento
| `data-champs-populate-child`          | Usado no FormPopulation
-------------------------------------------------------------------------

------------------------------------------------------------------------

## Modulo: CheckboxGroup

 Atributo                      | Função
|-------------------------------|---
| `data-champs-checkbox-child`   |`Checkbox filho
 | `data-champs-checkbox-counter` |`Seletor contador
 | `data-champs-checkbox-group`   |`Grupo
 | `data-champs-checkbox-parent`  |`Checkbox pai
 | `data-champs-checkbox-total`   |`Seletor soma
 | `data-champs-checkbox-value`   |`Valor numérico

------------------------------------------------------------------------

## Modulo: Consent

  -----------------------------------------------------------------------------
 Atributo                                 | Função
|------------------------------------------|---
| `data-champs-consent`                     |Ativa o módulo
 | `data-champs-consent-categories`          |Lista de categorias separadas por vírgula
 | `data-champs-consent-default-{categoria}` |Valor padrão da categoria
 | `data-champs-consent-policy-url`          |Link para política de privacidade
 | `data-champs-consent-scope`               |Define escopo isolado por sistema
 | `data-champs-consent-template`            |Template customizado
 | `data-champs-consent-version`             |Versão do consentimento
-----------------------------------------------------------------------------

------------------------------------------------------------------------

## Modulo: CopyText

 Atributo               | Função
|------------------------|---
| `data-champs-check`     | Marca checkbox após copiar
 | `data-champs-copy`      | Copia conteúdo próprio
 | `data-champs-copy-from` | Copia de outro seletor
 | `data-champs-copy-text` | Copia texto fixo

------------------------------------------------------------------------

## Modulo: Loader

 Atributo                     | Função
|------------------------------|---
| `data-champs-loader`          | Ativa loader no elemento
 | `data-champs-loader-mode`     | Define modo (overlay, inline)
 | `data-champs-loader-target`   | Define alvo
 | `data-champs-loader-template` | Define template
 | `data-champs-no-loader`       | Desativa loader

------------------------------------------------------------------------

## Modulo: Mask

Atributo | Função
|---|---
| `data-champs-mask` | Define máscara do campo

------------------------------------------------------------------------

## Modulo: Sanitize

  --------------------------------------------------------------------------
 Atributo                              | Função
|---------------------------------------|---
| `data-champs-sanitize`                 | Ativa o módulo
 | `data-champs-sanitize-collapse-spaces` | Substitui múltiplos espaços por 1
 | `data-champs-sanitize-lower`           | Converte para minúsculo
 | `data-champs-sanitize-max="N"`         | Limita a N caracteres
 | `data-champs-sanitize-no-spaces`       | Remove todos os espaços
 | `data-champs-sanitize-normalize`       | Remove acentos
 | `data-champs-sanitize-trim`            | Remove espaços início/fim
 | `data-champs-sanitize-upper`           | Converte para maiúsculo
--------------------------------------------------------------------------

------------------------------------------------------------------------

## Modulo: Validate

  ------------------------------------------------------------------------
 Atributo                            | Função
|-------------------------------------|---
| `data-champs-validate`               |Ativa o módulo
 | `data-champs-validate-disable-until` |Desabilita até documento do tipo informado
 | `data-champs-validate-doc-from`      |Seletor do Documento
 | `data-champs-validate-feedback`      |Seletor customizado para erro
 | `data-champs-validate-message`       |Mensagem customizada
 | `data-champs-validate-requires`      |Exige tipo específico de documento
 | `data-champs-validate-trigger`       |Evento disparador
 | `data-champs-validate-triggers`      |Revalida seletores associados
 | `data-champs-validate-type`          |Tipo: cpf, cnpj, cpfcnpj, ie
 | `data-champs-validate-uf-from`       |Seletor do campo UF
------------------------------------------------------------------------

------------------------------------------------------------------------

## Modulo: VisibilityToggle

 Atributo                          | Função
|-----------------------------------|---
| `data-champs-visibility-group`     | Grupo de elementos
 | `data-champs-visibility-icon-hide` | Ícone oculto
 | `data-champs-visibility-icon-mode` | Modo do ícone
 | `data-champs-visibility-icon-show` | Ícone visível
 | `data-champs-visibility-toggle`    | Ativa alternância

------------------------------------------------------------------------

## Modulo: Zipcode

 Atributo                                  | Função
|-------------------------------------------|---
| `data-champs-zipcode`                      | Ativa consulta de CEP
 | `data-champs-zipcode-field="city"`         | Campo cidade
 | `data-champs-zipcode-field="ddd"`          | Campo DDD
 | `data-champs-zipcode-field="error"`        | Exibe erro
 | `data-champs-zipcode-field="json"`         | Exibe JSON
 | `data-champs-zipcode-field="neighborhood"` | Campo bairro
 | `data-champs-zipcode-field="state"`        | Campo UF
 | `data-champs-zipcode-field="street"`       | Campo rua
 | `data-champs-zipcode-group`                | Grupo relacionado
 | `data-champs-zipcode-trigger`              | Evento disparador

------------------------------------------------------------------------

# 📡 Eventos Globais Disparados

| Evento | Disparado por | Descrição
|---|---|---
| `champs:validated` | Validate | Disparado após validação de CPF/CNPJ/IE
| `champs:sanitized` | Sanitize | Disparado após saneamento do input
| `champs:masked` | Mask | Disparado após aplicação de máscara
| `champs:consent:ready` | Consent | Disparado quando consentimento é carregado
| `champs:consent:changed` | Consent | Disparado quando usuário altera preferências
| `champs:ajax:success` | AjaxForm | Disparado após sucesso na requisição
| `champs:ajax:error` | AjaxForm | Disparado após erro na requisição
| `champs:loader:show` | Loader | Quando loader é exibido
| `champs:loader:hide` | Loader | Quando loader é ocultado

------------------------------------------------------------------------

Champs Core JS -- Documentação Oficial de Data Attributes e Eventos
