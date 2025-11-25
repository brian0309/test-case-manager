import React from "react";
import { LucideIcon } from "lucide-react";

/**
 * Input component props
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

/**
 * FloatingShape component props
 */
export interface FloatingShapeProps {
  color: string;
  size: string;
  top: string;
  left: string;
  delay: number;
}

/**
 * PasswordStrengthMeter component props
 */
export interface PasswordStrengthMeterProps {
  password: string;
}

/**
 * PasswordCriteria component props
 */
export interface PasswordCriteriaProps {
  password: string;
}

/**
 * LoadingSpinner component props
 */
export interface LoadingSpinnerProps {
  className?: string;
}

/**
 * GoogleLoginButton component props
 */
export interface GoogleLoginButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
}

/**
 * Header component props
 */
export interface HeaderProps {
  className?: string;
}

/**
 * Sidebar component props
 */
export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * SidebarMenuLayout component props
 */
export interface SidebarMenuLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout component props
 */
export interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Common page props
 */
export interface PageProps {
  className?: string;
}

/**
 * Route component props
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export interface RedirectAuthenticatedUserProps {
  children: React.ReactNode;
}
