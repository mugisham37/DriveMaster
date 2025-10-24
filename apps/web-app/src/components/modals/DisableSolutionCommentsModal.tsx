import React from "react";
import { useMutation } from "@tanstack/react-query";
import { sendRequest } from "@/utils/send-request";
import { SolutionForStudent } from "@/types";
import { FormButton } from "@/components/common/forms/FormButton";
import { ErrorBoundary, ErrorMessage } from "@/components/ErrorBoundary";
import { Modal, ModalProps } from "./Modal";
import { useAppTranslation } from "@/i18n/useAppTranslation";

const DEFAULT_ERROR = new Error("Unable to disable comments");

export const DisableSolutionCommentsModal = ({
  endpoint,
  onSuccess,
  ...props
}: Omit<ModalProps, "className" | "children"> & {
  endpoint: string;
  onSuccess: () => void;
}): React.JSX.Element => {
  const { t } = useAppTranslation(
    "components/modals/DisableSolutionCommentsModal.tsx"
  );
  const {
    mutate: mutation,
    status,
    error,
  } = useMutation<SolutionForStudent>({
    mutationFn: async () => {
      const { fetch } = sendRequest({
        endpoint: endpoint,
        method: "PATCH",
        body: undefined,
      });

      return fetch;
    },
    onSuccess: () => {
      props.onClose();
      onSuccess();
    },
  });

  return (
    <Modal {...props} className="m-generic-confirmation">
      <h3>{t("disableSolutionCommentsModal.confirmationTitle")}</h3>
      <p>{t("disableSolutionCommentsModal.confirmationDescription")}</p>

      <div className="buttons">
        <FormButton
          type="button"
          onClick={() => mutation()}
          status={
            status === "pending"
              ? "submitting"
              : status === "error"
              ? "error"
              : status === "success"
              ? "success"
              : "idle"
          }
          className="btn-primary btn-m"
        >
          {t("disableSolutionCommentsModal.disableComments")}
        </FormButton>
        <FormButton
          type="button"
          onClick={props.onClose}
          status={
            status === "pending"
              ? "submitting"
              : status === "error"
              ? "error"
              : status === "success"
              ? "success"
              : "idle"
          }
          className="btn-default btn-m"
        >
          {t("disableSolutionCommentsModal.cancel")}
        </FormButton>
      </div>
      <ErrorBoundary>
        <ErrorMessage error={error} defaultError={DEFAULT_ERROR} />
      </ErrorBoundary>
    </Modal>
  );
};
