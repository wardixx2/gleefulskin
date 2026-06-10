import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#b76e79",
  cancelButtonColor: "#8b6b6b",
};

export function showAlert(options) {
  return Swal.fire({
    ...baseOptions,
    ...options,
  });
}

export function showError(message, title = "Something went wrong") {
  return showAlert({
    icon: "error",
    title,
    text: message,
  });
}

export function showSuccess(message, title = "Success") {
  return showAlert({
    icon: "success",
    title,
    text: message,
  });
}

export function showWarning(message, title = "Please check this") {
  return showAlert({
    icon: "warning",
    title,
    text: message,
  });
}

export function confirmAction({ title, text, confirmButtonText = "Yes, continue" }) {
  return showAlert({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });
}
