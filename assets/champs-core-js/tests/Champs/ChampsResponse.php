<?php

namespace App\LegacySrc\Support\Champs;

class ChampsResponse
{
    private array $actions = [];
    private array $extra = [];

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

    /* ============================= */
    /*  DOM PATCH                    */
    /* ============================= */

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

    public function messageSuccess(string $text): self
    {
        return $this->message('success', $text);
    }

    public function messageError(string $text): self
    {
        return $this->message('error', $text);
    }

    public function messageWarning(string $text): self
    {
        return $this->message('warning', $text);
    }

    public function messageInfo(string $text): self
    {
        return $this->message('info', $text);
    }

    /* ============================= */
    /*  VALIDATION                   */
    /* ============================= */

    public function validationError(
        ?string $message = null,
        array $fields = [],
        bool $clearBefore = true,
        bool $persist = false,
        int $seconds = 5
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

    public function successAndCloseModal(string $message): self
    {
        return $this
            ->closeModal()
            ->messageSuccess($message);
    }

    public function successAndPopulate(string $message, array $payload): self
    {
        return $this
            ->populate($payload)
            ->messageSuccess($message);
    }

    public function successPopulateAndCloseModal(string $message, array $payload): self
    {
        return $this
            ->populate($payload)
            ->closeModal()
            ->messageSuccess($message);
    }

    /* ============================= */
    /*  OUTPUT                       */
    /* ============================= */

    public function toArray(): array
    {
        return array_merge([
            'actions' => $this->actions,
        ], $this->extra);
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
