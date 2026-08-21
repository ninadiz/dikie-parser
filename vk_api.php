<?php

class VkApiException extends Exception
{
}

function vkWallGet(string $domain, int $offset, int $count, string $accessToken, string $apiVersion): array
{
    $params = [
        'domain' => $domain,
        'offset' => $offset,
        'count' => $count,
        'access_token' => $accessToken,
        'v' => $apiVersion,
    ];

    $url = 'https://api.vk.com/method/wall.get?' . http_build_query($params);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);

    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new VkApiException('Запрос к VK API не удался: ' . $error);
    }
    curl_close($ch);

    $data = json_decode($response, true);
    if ($data === null) {
        throw new VkApiException('VK API вернул невалидный JSON');
    }

    if (isset($data['error'])) {
        throw new VkApiException(
            $data['error']['error_msg'] ?? 'Неизвестная ошибка VK API',
            $data['error']['error_code'] ?? 0
        );
    }

    return $data['response'] ?? ['items' => [], 'count' => 0];
}
