<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Response;

class AjaxFormRespose
{
    private array $actions = [];
    private array $extra = [];
    private array $data = [];
    private array $meta = [];

    public static function make(): self
    {
        return new self();
    }

    /* ============================= */
    /*  BASE                         */
    /* ============================= */

    public function addAction(array $action): self
    {
        $this->actions[] = $action;
        return $this;
    }

    public function action(array $action): self
    {
        return $this->addAction($action);
    }

    public function addActions(array $actions): self
    {
        foreach ($actions as $action) {
            if (is_array($action) && !empty($action)) {
                $this->actions[] = $action;
            }
        }

        return $this;
    }

    public function extra(string $key, mixed $value): self
    {
        $this->extra[$key] = $value;
        return $this;
    }

    /**
     * Dados livres para consumo por módulos JS após a execução do AjaxForm.
     *
     * Exemplo de uso:
     * $response->data([
     *     'counter' => 2,
     *     'notification_id' => 15,
     * ]);
     */
    public function data(array $data): self
    {
        $this->data = array_replace_recursive($this->data, $data);
        return $this;
    }

    public function dataItem(string $key, mixed $value): self
    {
        $this->data[$key] = $value;
        return $this;
    }

    /**
     * Metadados opcionais para integração entre módulos JS.
     * Mantido separado de data para não misturar dados de negócio com contexto técnico.
     */
    public function meta(array $meta): self
    {
        $this->meta = array_replace_recursive($this->meta, $meta);
        return $this;
    }

    public function metaItem(string $key, mixed $value): self
    {
        $this->meta[$key] = $value;
        return $this;
    }

    /* ============================= */
    /*  DOM PATCH                    */
    /* ============================= */

    protected function domPatchSelector(array $selector): array
    {
        $allowed = ['target', 'id', 'class', 'data', 'multiple'];
        $result = [];

        foreach ($allowed as $key) {
            if (array_key_exists($key, $selector)) {
                $result[$key] = $selector[$key];
            }
        }

        if (empty($result)) {
            throw new \InvalidArgumentException(
                'DomPatch selector inválido. Informe target, id, class, data ou multiple.'
            );
        }

        return $result;
    }

    public function domPatchReplace(array $selector, string $html): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'replace',
            'html' => $html,
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchAppend(array $selector, string $html): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'append',
            'html' => $html,
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchPrepend(array $selector, string $html): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'prepend',
            'html' => $html,
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchRemove(array $selector): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'remove',
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchClear(array $selector): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'clear',
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchText(array $selector, string $text): self
    {
        return $this->addAction(array_merge([
            'type' => 'dom-patch',
            'operation' => 'text',
            'text' => $text,
        ], $this->domPatchSelector($selector)));
    }

    public function domPatchAttr(
        array $selector,
        string $name,
        ?string $value = null,
        bool $remove = false
    ): self {
        $action = array_merge([
            'type' => 'dom-patch',
            'operation' => 'attr',
            'name' => $name,
        ], $this->domPatchSelector($selector));

        if ($remove) {
            $action['remove'] = true;
        } else {
            $action['value'] = $value;
        }

        return $this->addAction($action);
    }

    public function domPatch(
        string $operation,
        string $target,
        ?string $html = null,
        array $extra = []
    ): self {
        $action = array_merge([
            'type' => 'dom-patch',
            'operation' => $operation,
            'target' => $target,
        ], $extra);

        if ($html !== null) {
            $action['html'] = $html;
        }

        return $this->addAction($action);
    }

    /* ============================= */
    /*  MESSAGE                      */
    /* ============================= */

    public function message(
        string $level,
        string $text,
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        ?string $target = '.champs_post_response',
        bool $broadcast = false
    ): self {
        $action = [
            'type' => 'message',
            'level' => $level,
            'text' => $text,
            'clearBefore' => $clearBefore,
            'persist' => $persist,
            'target' => $target,
            'broadcast' => $broadcast,
        ];

        if (!$persist) {
            $action['seconds'] = $seconds;
        }

        return $this->addAction($action);
    }

    public function messageSuccess(
        string $text,
        ?string $target = '.champs_post_response',
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        bool $broadcast = false
    ): self {
        return $this->message('success', $text, $clearBefore, $persist, $seconds, $target, $broadcast);
    }

    public function messageError(
        string $text,
        ?string $target = '.champs_post_response',
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        bool $broadcast = false
    ): self {
        return $this->message('error', $text, $clearBefore, $persist, $seconds, $target, $broadcast);
    }

    public function messageWarning(
        string $text,
        ?string $target = '.champs_post_response',
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        bool $broadcast = false
    ): self {
        return $this->message('warning', $text, $clearBefore, $persist, $seconds, $target, $broadcast);
    }

    public function messageInfo(
        string $text,
        ?string $target = '.champs_post_response',
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        bool $broadcast = false
    ): self {
        return $this->message('info', $text, $clearBefore, $persist, $seconds, $target, $broadcast);
    }

    /* ============================= */
    /*  VALIDATION                   */
    /* ============================= */

    public function validationError(
        ?string $message = null,
        array $fields = [],
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5,
        ?string $target = '.champs_post_response',
        bool $broadcast = false
    ): self {
        if (($message === null || $message === '') && empty($fields)) {
            return $this;
        }

        $action = [
            'type' => 'validation-error',
            'fields' => $fields,
            'clearBefore' => $clearBefore,
            'persist' => $persist,
            'seconds' => $seconds,
            'target' => $target,
            'broadcast' => $broadcast,
        ];

        if ($message !== null && $message !== '') {
            $action['message'] = $message;
        }

        return $this->addAction($action);
    }

    /* ============================= */
    /*  MODAL                        */
    /* ============================= */

    public function modal(
        string $title,
        string $body,
        array $buttons = []
    ): self {
        return $this->addAction([
            'type' => 'modal',
            'title' => $title,
            'body' => $body,
            'buttons' => $buttons,
        ]);
    }

    public function modalHtml(string $html, bool $full = true): self
    {
        return $this->addAction([
            'type' => 'modal',
            'html' => $html,
            'full' => $full,
        ]);
    }

    public function closeModal(?string $target = null): self
    {
        $action = ['type' => 'close-modal'];

        if ($target) {
            $action['target'] = $target;
        }

        return $this->addAction($action);
    }

    /* ============================= */
    /*  FORM / DATA                  */
    /* ============================= */

    public function populate(
        string $target,
        string $kind,
        mixed $data = null,
        array $options = [],
        array $reset = []
    ): self {
        $action = [
            'type' => 'populate',
            'target' => $target,
            'kind' => $kind,
            'data' => $data,
        ];

        if (!empty($options)) {
            $action['options'] = $options;
        }

        if (!empty($reset)) {
            $action['reset'] = $reset;
        }

        return $this->addAction($action);
    }

    public function formFiller(array $data): self
    {
        return $this->addAction([
            'type' => 'formfiller',
            'data' => $data,
        ]);
    }

    /* ============================= */
    /*  ACTION RULES / UI ACTIONS    */
    /* ============================= */

    public function uiActions(array $actions, array $context = [], ?string $scope = null): self
    {
        $action = [
            'type' => 'ui-actions',
            'actions' => $actions,
        ];

        if (!empty($context)) {
            $action['context'] = $context;
        }

        if ($scope) {
            $action['scope'] = $scope;
        }

        return $this->addAction($action);
    }

    public function uiAction(
        string $operation,
        string $target,
        mixed $value = null,
        ?string $name = null,
        array $extra = []
    ): self {
        $action = array_merge([
            'operation' => $operation,
            'target' => $target,
        ], $extra);

        if ($value !== null) {
            $action['value'] = $value;
        }

        if ($name !== null && $name !== '') {
            $action['name'] = $name;
        }

        return $this->uiActions([$action]);
    }

    public function actionRules(array $rules, array $context = [], ?string $scope = null): self
    {
        $action = [
            'type' => 'action-rules',
            'rules' => $rules,
        ];

        if (!empty($context)) {
            $action['context'] = $context;
        }

        if ($scope) {
            $action['scope'] = $scope;
        }

        return $this->addAction($action);
    }

    public function namedActionRules(string $name, array $context = [], ?string $scope = null): self
    {
        $action = [
            'type' => 'named-action-rules',
            'name' => $name,
        ];

        if (!empty($context)) {
            $action['context'] = $context;
        }

        if ($scope) {
            $action['scope'] = $scope;
        }

        return $this->addAction($action);
    }

    public function show(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'show',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function hide(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'hide',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function enable(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'enable',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function disable(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'disable',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function setValue(string $target, mixed $value, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'value',
                'target' => $target,
                'value' => $value,
            ]
        ], [], $scope);
    }

    public function setText(string $target, string $value, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'text',
                'target' => $target,
                'value' => $value,
            ]
        ], [], $scope);
    }

    public function setHtml(string $target, string $value, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'html',
                'target' => $target,
                'value' => $value,
            ]
        ], [], $scope);
    }

    public function addClass(string $target, string $className, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'addClass',
                'target' => $target,
                'value' => $className,
            ]
        ], [], $scope);
    }

    public function removeClass(string $target, string $className, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'removeClass',
                'target' => $target,
                'value' => $className,
            ]
        ], [], $scope);
    }

    public function attr(string $target, string $name, mixed $value, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'attr',
                'target' => $target,
                'name' => $name,
                'value' => $value,
            ]
        ], [], $scope);
    }

    public function removeAttr(string $target, string $name, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'removeAttr',
                'target' => $target,
                'name' => $name,
            ]
        ], [], $scope);
    }

    public function required(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'required',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function notRequired(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'notRequired',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function readonly(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'readonly',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function notReadonly(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'notReadonly',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function checked(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'checked',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function unchecked(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'unchecked',
                'target' => $target,
            ]
        ], [], $scope);
    }

    public function focus(string $target, ?string $scope = null): self
    {
        return $this->uiActions([
            [
                'operation' => 'focus',
                'target' => $target,
            ]
        ], [], $scope);
    }

    /* ============================= */
    /*  NAVIGATION                   */
    /* ============================= */

    public function redirect(string $url): self
    {
        return $this->addAction([
            'type' => 'redirect',
            'url' => $url,
        ]);
    }

    public function reload(): self
    {
        return $this->addAction([
            'type' => 'reload',
        ]);
    }

    /* ============================= */
    /*  CUSTOM                       */
    /* ============================= */

    public function custom(string $function, mixed $data = null): self
    {
        $action = [
            'type' => 'custom',
            'function' => $function,
        ];

        if ($data !== null) {
            $action['data'] = $data;
        }

        return $this->addAction($action);
    }

    public function openNewPage(array $pages): self
    {
        return $this->addAction([
            'type' => 'open-new-page',
            'pages' => $pages,
        ]);
    }

    public function openNewPageUrl(string $url, string $target = '_blank'): self
    {
        return $this->openNewPage([
            [
                'url' => $url,
                'target' => $target,
            ],
        ]);
    }

    /* ============================= */
    /*  HELPERS                      */
    /* ============================= */

    public function successAndCloseModal(
        string $message,
        ?string $target = '.champs_post_response'
    ): self {
        return $this
            ->closeModal()
            ->messageSuccess($message, $target);
    }

    public function successAndPopulate(
        string $message,
        string $populateTarget,
        string $populateKind,
        mixed $payload = null,
        array $options = [],
        array $reset = [],
        ?string $messageTarget = '.champs_post_response'
    ): self {
        return $this
            ->populate($populateTarget, $populateKind, $payload, $options, $reset)
            ->messageSuccess($message, $messageTarget);
    }

    public function successPopulateAndCloseModal(
        string $message,
        string $populateTarget,
        string $populateKind,
        mixed $payload = null,
        array $options = [],
        array $reset = [],
        ?string $messageTarget = '.champs_post_response'
    ): self {
        return $this
            ->populate($populateTarget, $populateKind, $payload, $options, $reset)
            ->closeModal()
            ->messageSuccess($message, $messageTarget);
    }

    /* ============================= */
    /*  OUTPUT                       */
    /* ============================= */

    public function toArray(): array
    {
        $payload = [
            'actions' => $this->actions,
        ];

        if (!empty($this->data)) {
            $payload['data'] = $this->data;
        }

        if (!empty($this->meta)) {
            $payload['meta'] = $this->meta;
        }

        return array_merge($payload, $this->extra);
    }

    public function toJson(): string
    {
        return json_encode(
            $this->toArray(),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
    }

    public function send(): void
    {
        header('Content-Type: application/json; charset=utf-8');
        echo $this->toJson();
    }
}
