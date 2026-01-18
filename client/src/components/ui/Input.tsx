import React, { forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    icon,
    fullWidth = false,
    className = '',
    id,
    ...props
}, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    
    const containerClass = [
        styles.container,
        fullWidth && styles.fullWidth,
        error && styles.hasError,
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClass}>
            {label && (
                <label htmlFor={inputId} className={styles.label}>
                    {label}
                </label>
            )}
            <div className={styles.inputWrapper}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <input
                    ref={ref}
                    id={inputId}
                    className={`${styles.input} ${icon ? styles.hasIcon : ''}`}
                    {...props}
                />
            </div>
            {error && <span className={styles.error}>{error}</span>}
            {hint && !error && <span className={styles.hint}>{hint}</span>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
