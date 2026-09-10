<?php

class AnthropicApiException extends Exception
{
}

function anthropicMessage(string $apiKey, string $model, string $systemPrompt, string $userContent, int $maxTokens = 4096): string
{
    $payload = json_encode([
        'model' => $model,
        'max_tokens' => $maxTokens,
        'system' => $systemPrompt,
        'messages' => [
            ['role' => 'user', 'content' => $userContent],
        ],
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'content-type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
    ]);
    $response = curl_exec($ch);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new AnthropicApiException('Запрос к Anthropic API не удался: ' . $error);
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if ($data === null) {
        throw new AnthropicApiException('Anthropic API вернул невалидный JSON');
    }

    if (($data['type'] ?? null) === 'error') {
        throw new AnthropicApiException($data['error']['message'] ?? 'Неизвестная ошибка Anthropic API');
    }

    return $data['content'][0]['text'] ?? '';
}
