<?php

require __DIR__ . '/session_init.php';
initSession();
header('Content-Type: application/json');

$_SESSION = [];
session_destroy();

echo json_encode(['success' => true]);
