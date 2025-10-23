import React, { lazy, Suspense } from "react";
import currency from "currency.js";
import { DiscussionActionsLinks } from "@/components/student/mentoring-session/DiscussionActions";
import {
  PaymentIntentType,
  MentoringSessionDonation,
} from "@/components/types";
import { useAppTranslation } from "@/i18n/useAppTranslation";

const Form = lazy(() => import("@/components/donations/Form"));

export function DonationStep({
  donation: _donation,
  links,
  onSuccessfulDonation,
}: {
  donation: MentoringSessionDonation;
  links: DiscussionActionsLinks;
  onSuccessfulDonation: (type: PaymentIntentType, amount: currency) => void;
}): React.ReactElement {
  const { t } = useAppTranslation(
    "components/modals/student/finish-mentor-discussion-modal"
  );

  // Note: _donation prop is available for future customization of the donation flow

  return (
    <div id="a11y-finish-mentor-discussion" className="flex flex-row">
      <div className="mr-64 max-w-[700px]">
        <h3 className="text-h4 mb-4 text-prominentLinkColor">
          {t("donationStep.oneMoreRequest")}
        </h3>
        <h1 className="text-h1 mb-12">
          {t("donationStep.areYouFindingHelpful")}
        </h1>

        <div className="mb-20 pb-20 border-b-1 border-borderColor7">
          <p>{t("donationStep.donationContent")}</p>
        </div>

        <h3 className="text-h4 mb-6">{t("donationStep.cantAfford")}</h3>
        <p className="text-p-large mb-20">{t("donationStep.shareMessage")}</p>

        <h3 className="text-h4 mb-6">{t("donationStep.wantToKnowMore")}</h3>
        <p className="text-p-large mb-20">
          {t("donationStep.whyWeNeedDonations")}
        </p>

        <div className="c-youtube-container mb-32">
          <iframe
            width="560"
            height="315"
            style={{ border: "none" }}
            src="https://player.vimeo.com/video/855534271?h=97d3a4c8c2&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479&transparent=0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <script src="https://player.vimeo.com/api/player.js" async />
        </div>

        <div className="flex">
          <a
            href={links.exercise}
            className="btn-enhanced btn-l !shadow-xsZ1v3 py-16 px-24 mb-16"
          >
            {t("donationStep.continueWithoutDonating")}
          </a>
        </div>
      </div>

      <div className="flex flex-col items-end bg-transparent">
        <div className="w-[564px] shadow-lgZ1 rounded-8 mb-20">
          <Suspense fallback={<div className="c-loading-suspense" />}>
            <Form
              onSuccess={(amount) =>
                onSuccessfulDonation("donation", currency(amount))
              }
            />
          </Suspense>
        </div>

        <div className="w-[564px] border-2 border-gradient bg-lightPurple py-12 px-24 rounded-8">
          <p className="text-gradient font-semibold leading-160 text-17">
            {t("donationStep.lessThanOnePercentDonate")}
          </p>
        </div>
      </div>
    </div>
  );
}
