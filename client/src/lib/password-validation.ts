const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function getPasswordValidationError(password: string): string | null {
    // Match class-validator's MinLength count, including Unicode presentation sequences.
    const presentationSequences = password.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g);
    const length = Array.from(password).length - (presentationSequences?.length ?? 0);
    if (length < 8) return '비밀번호는 8자 이상이어야 합니다.';
    if (!PASSWORD_PATTERN.test(password)) {
        return '비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.';
    }
    if (new TextEncoder().encode(password).length > 72) {
        return '비밀번호는 72바이트 이하여야 합니다.';
    }
    return null;
}
