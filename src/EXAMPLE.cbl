      ******************************************************************
      * Example                                                        *
      ******************************************************************
          02 WI_MC_RESULT.
             03 WI_MC_RESULT_PROVIDER    PIC X(12).
             03 WI_MC_RESULT_STATE       PIC X(04).
             03 WI_MC_RESULT_CODE        PIC X(04).
             03 WI_MC_RESULT_DESCRIPTION PIC X(512).
             03 WI_MC_RESULT_TYPE        PIC X(16).
             03 WI_MC_RESULT_OPERATION   PIC X(24).
             03 WI_MC_RESULT_ADDONS.
                05 WI_MC_ADDON_COUNT     PIC 9(1).
                05 WI_MC_ADDON_VALUE     PIC 9(4) COMP-3.
                05 WI_MC_ADDON_GROUP.
                  07 WI_MC_GROUP_SIZE    PIC 9(1).
                  07 WI_MC_GROUP_TOKEN   PIC X(64).
             03 WI_MC_END                PIC X.
