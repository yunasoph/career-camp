<?php

declare(strict_types=1);

namespace CareerCampus\Validation;

use Respect\Validation\Validator;

/**
 * All field-level rules in one place, so quirk handling (respect/validation
 * 2.x) is centralized. Each method returns an error-details map of the shape
 * `{field: [messages]}` — an empty array means the input is valid.
 *
 * Field limits mirror the schema (spec §6): display_name varchar(60),
 * timezone varchar(64), password >= 10 chars (spec §7).
 */
final class FieldRules
{
    /**
     * @param array<string, mixed> $data
     * @return array<string, list<string>>
     */
    public static function register(array $data): array
    {
        $errors = [];
        $email = self::string($data, 'email');
        $password = self::string($data, 'password');
        $displayName = self::string($data, 'display_name');

        if (!Validator::email()->validate($email)) {
            $errors['email'] = ['Must be a valid email address.'];
        }
        if (mb_strlen($password) < 10) {
            $errors['password'] = ['Must be at least 10 characters.'];
        }
        if (mb_strlen($displayName) < 1 || mb_strlen($displayName) > 60) {
            $errors['display_name'] = ['Must be 1-60 characters.'];
        }

        return $errors;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, list<string>>
     */
    public static function login(array $data): array
    {
        $errors = [];
        $email = self::string($data, 'email');
        $password = self::string($data, 'password');

        if (!Validator::email()->validate($email)) {
            $errors['email'] = ['Must be a valid email address.'];
        }
        if ($password === '') {
            $errors['password'] = ['Must not be empty.'];
        }

        return $errors;
    }

    /**
     * PATCH /me: any subset of display_name, avatar_url, timezone.
     * Only the fields actually present are validated.
     *
     * @param array<string, mixed> $data
     * @return array<string, list<string>>
     */
    public static function updateProfile(array $data): array
    {
        $errors = [];

        if (array_key_exists('display_name', $data)) {
            $name = self::string($data, 'display_name');
            if (mb_strlen($name) < 1 || mb_strlen($name) > 60) {
                $errors['display_name'] = ['Must be 1-60 characters.'];
            }
        }

        if (array_key_exists('avatar_url', $data) && $data['avatar_url'] !== null) {
            $url = self::string($data, 'avatar_url');
            if (!Validator::url()->validate($url)) {
                $errors['avatar_url'] = ['Must be a valid URL.'];
            }
        }

        if (array_key_exists('timezone', $data)) {
            $tz = self::string($data, 'timezone');
            if (!in_array($tz, timezone_identifiers_list(), true)) {
                $errors['timezone'] = ['Must be a valid IANA timezone.'];
            }
        }

        return $errors;
    }

    /** @param array<string, mixed> $data */
    private static function string(array $data, string $field): string
    {
        $value = $data[$field] ?? '';

        return is_string($value) ? $value : '';
    }
}
