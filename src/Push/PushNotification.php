<?php

declare(strict_types=1);

namespace BetoCampoy\Champs\Frontend\Push;

final class PushNotification
{
    private string $title = '';
    private string $body  = '';
    private ?string $imageUrl = null;
    private ?string $clickUrl = null;
    private array $extraData = [];

    public static function make(): self
    {
        return new self();
    }

    public function title(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function body(string $body): self
    {
        $this->body = $body;
        return $this;
    }

    public function image(string $url): self
    {
        $this->imageUrl = $url;
        return $this;
    }

    public function url(string $url): self
    {
        $this->clickUrl = $url;
        return $this;
    }

    /**
     * Dados adicionais incluídos no payload FCM (disponíveis em payload.data no JS).
     */
    public function data(array $data): self
    {
        $this->extraData = array_merge($this->extraData, $data);
        return $this;
    }

    public function toArray(): array
    {
        $notification = ['title' => $this->title];

        if ($this->body !== '') {
            $notification['body'] = $this->body;
        }

        if ($this->imageUrl !== null) {
            $notification['image'] = $this->imageUrl;
        }

        $data = $this->extraData;

        if ($this->clickUrl !== null) {
            $data['clickUrl'] = $this->clickUrl;
        }

        $payload = ['notification' => $notification];

        if (!empty($data)) {
            // FCM exige que todos os valores em data sejam strings
            $payload['data'] = array_map('strval', $data);
        }

        return $payload;
    }
}
