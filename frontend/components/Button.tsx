"use client";

import React from "react";
import { useAudio } from "../hooks/useAudio";
import { Button as UIButton, ButtonProps as UIButtonProps } from "./ui/Button";

export type ButtonProps = UIButtonProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClickAudio, ...props }, ref) => {
    const { playClick } = useAudio();

    return (
      <UIButton
        ref={ref}
        onClickAudio={onClickAudio || playClick}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
