import { useMutation } from "@tanstack/react-query";
import { accountService } from "@daycare-hub/services";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: accountService.updateProfile,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: accountService.changePassword,
  });
}
