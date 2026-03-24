import { config } from "@/lib/config";
import { SendPageClient } from "@/app/send/send-page-client";

export default function SendPage() {
  return (
    <SendPageClient
      maxUploadFileBytes={config.maxUploadFileBytes}
      maxUploadFiles={config.maxUploadFiles}
    />
  );
}
