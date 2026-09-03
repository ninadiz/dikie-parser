<?php

// Read-only: baseline_date is hardcoded (see NOTES.md) so nobody can change it by
// accident through the now-loginless admin panel — no POST handling here anymore.

header('Content-Type: application/json');

require __DIR__ . '/../db.php';

echo json_encode(['baseline_date' => getSetting('baseline_date')]);
