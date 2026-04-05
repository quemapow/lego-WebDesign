import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

const DEFAULT_COOKIE = "_lm_id=5LHUHMTU3YOSW9K1; __ps_r=https://accounts.google.com/; __ps_lu=https://www.vinted.fr/member/signup/select_type?state=eyJyZWRpcmVjdF91cmkiOiJodHRwczovL3d3dy52aW50ZWQuZnIvIiwicmFu%0AZG9tX3N0cmluZyI6ImUwMjAzNzE4MmYiLCJyZXR1cm5fdXJsIjoiLyJ9%0A&code=4%2F0ATX87lM0HZbnfp1GUg524YWEv451zAwfThpkOJjWgOtn5VW7vppGDm4z5GF3v29N7gfMMg&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+openid&authuser=0&prompt=none; __ps_did=pscrb_81de1e63-7259-48b6-f5bb-366ad82d6ba7; __ps_fva=1766264711832; RoktRecogniser=ccab1ff5-e927-4aa6-9f10-e47f33b560ef; v_udt=bGZuMFlCaFh2a0Q1M1RtRzJyVFNpbjdGYUFnay0tYXlISlM1dkFIRVhhSGRmTi0tNlZGV1FDSzJScnN5UFEvVGhNK0k1UT09; anonymous-locale=fr; non_dot_com_www_domain_cookie_buster=1; is_shipping_fees_applied_info_banner_dismissed=false; OptanonAlertBoxClosed=2026-03-23T07:12:19.087Z; eupubconsent-v2=CQhhIxgQhhIxgAcABBFRCXFsAP_gAEPgAAwILNtR_G__bWlr-Tb3abpkeYxP99hr7sQxBgbJk24FzLPW7JwCx2E5NAzatqIKmRIAu3TBIQNlHIDURUCgKIgFryDMaEyUoTNKJ6BkiBMRA2JYCFxvm4pjWQCY4vr_5lc1mB-N7dr82dzyy4hHn3a5fmS1UJCcIYetDfn8ZBKT-9IEd-x8v4v4_EbpEm-eS1n_pGtp4jd6YlM_dBmxt-TyffzPn_frk_e7X_vc_n3zv8oXH77r_4LMgAmGhUQRlkQABAoCAECABQVhABQIAgAASBogIATBgQ5AwAXWEyAEAKAAYIAQAAgwABAAAJAAhEAEABAIAQIBAoAAwAIAgIAGBgADABYiAQAAgOgYpgQQCBYAJEZVBpgSgAJBAS2VCCQBAgrhCkWOAQQIiYKAAAEAAoAAAB8LAQklBKxIIAuILoAACAAAKIECBFIWYAgoDNFoKwJOAyNMAyfMEySnQZAEwQkZBkQmqCQeKYogAAAA.f_wACHwAAAAA.ILNtR_G__bXlv-Tb36bpkeYxf99hr7sQxBgbJs24FzLvW7JwC32E7NEzatqYKmRIAu3TBIQNtHIjURUChKIgVrzDsaEyUoTtKJ-BkiDMRY2JYCFxvm4pjWQCZ4vr_51d9mT-N7dr-2dzyy5hnv3a9fuS1UJicKYetHfn8ZBKT-_IU9_x-_4v4_MbpEm-eS1v_tGtt43d64tP_dpuxt-Tyffz___f72_e7X__c__33_-qXX_77_4A; OTAdditionalConsentString=1~43.55.61.70.83.89.93.108.117.122.124.135.143.144.147.149.159.192.196.211.228.230.239.259.266.286.291.311.320.322.323.327.367.371.385.407.415.424.430.436.445.486.491.494.495.522.523.540.550.560.568.574.576.584.587.591.737.803.820.839.864.899.904.922.938.959.979.981.985.1003.1027.1031.1046.1051.1053.1067.1092.1095.1097.1099.1107.1109.1135.1143.1149.1152.1162.1166.1186.1188.1205.1215.1226.1227.1230.1252.1268.1270.1276.1284.1290.1301.1307.1312.1329.1345.1356.1403.1415.1416.1421.1423.1440.1449.1455.1495.1512.1516.1525.1540.1548.1555.1558.1570.1577.1579.1583.1584.1603.1616.1638.1651.1653.1659.1667.1677.1678.1682.1697.1699.1703.1712.1716.1721.1725.1732.1745.1750.1765.1782.1786.1800.1810.1825.1827.1832.1838.1840.1843.1845.1859.1870.1878.1880.1889.1917.1929.1942.1944.1962.1963.1964.1967.1968.1969.1978.1985.1987.2003.2027.2035.2039.2047.2052.2056.2064.2068.2072.2074.2088.2090.2103.2107.2109.2115.2124.2130.2133.2135.2137.2140.2147.2156.2166.2177.2186.2205.2213.2216.2219.2220.2222.2225.2234.2253.2275.2279.2282.2309.2312.2316.2322.2325.2328.2331.2335.2336.2343.2354.2358.2359.2370.2376.2377.2387.2400.2403.2405.2411.2414.2416.2418.2425.2440.2447.2461.2465.2468.2472.2477.2484.2486.2488.2498.2510.2517.2526.2527.2532.2535.2542.2552.2563.2564.2567.2568.2569.2571.2572.2575.2577.2583.2584.2596.2604.2605.2608.2609.2610.2612.2614.2621.2627.2628.2629.2633.2636.2642.2643.2645.2646.2650.2651.2652.2656.2657.2658.2660.2661.2669.2670.2677.2681.2684.2687.2690.2695.2698.2713.2714.2729.2739.2767.2768.2770.2772.2784.2787.2791.2792.2798.2801.2805.2812.2813.2816.2817.2821.2822.2827.2830.2831.2833.2834.2838.2839.2844.2846.2849.2850.2852.2854.2860.2862.2863.2865.2867.2869.2874.2875.2878.2880.2881.2882.2884.2886.2887.2888.2889.2891.2893.2894.2895.2897.2898.2900.2901.2908.2909.2916.2917.2918.2920.2922.2923.2927.2929.2930.2931.2940.2941.2947.2949.2950.2956.2958.2961.2963.2964.2965.2966.2968.2973.2975.2979.2980.2981.2983.2985.2986.2987.2994.2995.2997.2999.3000.3002.3003.3005.3008.3009.3010.3012.3016.3017.3018.3019.3028.3034.3038.3043.3052.3053.3055.3058.3059.3063.3066.3068.3070.3073.3074.3075.3076.3077.3089.3090.3093.3094.3095.3097.3099.3100.3106.3109.3112.3117.3119.3126.3127.3128.3130.3135.3136.3145.3150.3151.3154.3155.3163.3167.3172.3173.3182.3183.3184.3185.3187.3188.3189.3190.3194.3196.3209.3210.3211.3214.3215.3217.3222.3223.3225.3226.3227.3228.3230.3231.3234.3235.3236.3237.3238.3240.3244.3245.3250.3251.3253.3257.3260.3270.3272.3281.3288.3290.3292.3293.3296.3299.3300.3306.3307.3309.3314.3315.3316.3318.3324.3328.3330.3331.3531.3731.3831.4131.4531.4631.4731.4831.5231.6931.7235.7831.7931.8931.9731.10231.10631.10831.11031.11531.13632.14034.14133.14237.14332.15731.16831.16931.21233.23031.25131.25931.26031.26631.26831.27731.27831.28031.28731.28831.29631.32531.33931.34231.34631.36831.39131.39531.40632.41131.41531.43631.43731.43831.45931.47232.47531.48131.49231.49332.49431.50831.52831; _gcl_au=1.1.987895115.1774249940; _ga=GA1.1.730503473.1774249940; _fbp=fb.1.1774249940580.793587694921949654; v_sid=c298a8b1-1774249931; domain_selected=true; _pubcid=2c7c9906-59fb-4eaa-8ad4-dd5c8751e462; _cc_id=b54715c112c97cc4d745f8ea841ad607; panoramaId_expiry=1774345956895; panoramaId=a6d14c1bb2afbb2d334b1d536179a9fb927af7a7f7227a27f65e915d46511d96; panoramaIdType=panoDevice; cf_clearance=IdgXQgjtT18H72Xnz3fbwOPJdf66RYd8oa8HBPM2ywM-1774282665-1.2.1.1-9I0xEL2tt7NAe_9_HdeLJLXSsorKL_vle2UTzGv5sccwZK8gKKjCkov04c3_NJLexazI12xTWlEgOWg8FIN_0oofHSq6qlPDcaNFmKezHJSki4jZ0eX81MoCjGGm8s6H48AvQ.TWdXizQ2AzEeH3IHH46vOb2K4GwUQrUl0eeKxpYXSHfWIccDgSo4RzWYPDBoHN7UPygqg6B3VZ24ycrH9aPTh5jDHikMEdNqEn__s; __cf_bm=hzZlJd9x.zvbUzqHPAgly41d6KrnOxOTy1pcgg8HdUs-1774282665.5264063-1.0.1.1-h7onx64ZOK2tlkRTl.oNF5Ztda5rQAeNEDt5meN.eIp3JLro.PZ26VLNFts8iFF5u6p3wELHbogMJaVxPJZvLznUYa75KnOEyDTEzxovKvM6bcF_Jst4hKH8M4J8kLd5UC.mATLbI68S5VjdUuMYIA; __ps_sr=_; __ps_slu=https://www.vinted.fr/session-refresh?ref_url=%2F; refresh_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhY2NvdW50X2lkIjoxMzg1OTI3MzksImFwcF9pZCI6NCwiYXVkIjoiZnIuY29yZS5hcGkiLCJjbGllbnRfaWQiOiJ3ZWIiLCJleHAiOjE3NzQ4ODgwMDksImlhdCI6MTc3NDI4MzIwOSwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwicHVycG9zZSI6InJlZnJlc2giLCJzY29wZSI6InVzZXIiLCJzaWQiOiJhMWI2MWY0MS0xNzc0MjgzMjA5Iiwic3ViIjoiMTk2MzM4NTkwIiwiY2MiOiJGUiIsImFuaWQiOiJkNWQ4NGNhZS1lMTM5LTRhY2UtYmNkMS00MjMxOTVjNGY3NmIiLCJhY3QiOnsic3ViIjoiMTk2MzM4NTkwIn19.pxJJ_hO9-YHF30c1QhFcaBdI2kTku4jFGmBCWMMGSfSqVzx_p7OO-WXpelw1sp99Sk8oFHX5KFuSeOIK7Q3XbNnEKegZ2yN_ty7vripHLKW0K_rfZn0kmhcudbLXlb1_gaiWQgLBW05rvIhggwSlZqehmFATYkpVj8Gv8oWeMYmVVkEkMycnxu4Dd3ekLM-IKg9M2d_BuMaJAGoA6uqorY08NEHwyf9xZo4XebPl20ADFpxsgRVLN_8tXvYnz1s1_-SH_D_qom0VeGeqPcQ7heIiZJ43GMcufzAhvwXbjFvXrCsqfQmPm9mtb56W4DOMgRcTUgc04oLwiP994KI3SQ; access_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhY2NvdW50X2lkIjoxMzg1OTI3MzksImFwcF9pZCI6NCwiYXVkIjoiZnIuY29yZS5hcGkiLCJjbGllbnRfaWQiOiJ3ZWIiLCJleHAiOjE3NzQyOTA0MDksImlhdCI6MTc3NDI4MzIwOSwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwicHVycG9zZSI6ImFjY2VzcyIsInNjb3BlIjoidXNlciIsInNpZCI6ImExYjYxZjQxLTE3NzQyODMyMDkiLCJzdWIiOiIxOTYzMzg1OTAiLCJjYyI6IkZSIiwiYW5pZCI6ImQ1ZDg0Y2FlLWUxMzktNGFjZS1iY2QxLTQyMzE5NWM0Zjc2YiIsImFtciI6WyJtZmEiXSwiYWN0Ijp7InN1YiI6IjE5NjMzODU5MCJ9fQ.vryQnevpjnRqQjcTrI_va6ElX6oYEpfPiLK59D3lbNg2Z3FfQU0BQOWIuri76dh5uNLVRsMgPRDyYO9iqsUxBYxXSo4grDRVqMBfQBrT2Ji2WL3xU2PpgPYOyiluPr_d5ukCHhggv1Hh0fAeCCd_2G2neY23dbJHIvpSi3z6VDNba090yOiyzBOSea2Mlsxa89St_KhWlIcJQ4EtQ3bXV0NVO7e_ECvg-q8vJNJOioIWePNBI8UQLuL89om4QP_yVJT4rDu4hv7jwRba8sYQoJ_6ZrqVQdyJAPW6b8RARiMSpGCAFlnTSKzuTSPe_NeEwLw8kfdpWYJZ2aHrMYskyQ; anon_id=d5d84cae-e139-4ace-bcd1-423195c4f76b; v_uid=196338590; v_sid=a1b61f41-1774283209; __gads=ID=cefc32b9b0f54c44:T=1766264732:RT=1774283220:S=ALNI_MaB0i-Gn_ztZgu9Cmp_y69T2pQZCQ; __eoi=ID=a1adfd7bb59c2ded:T=1766264732:RT=1774283220:S=AA-AfjYEPxBBciFeAEgk9ibl8Yhy; viewport_size=956; seller_header_visits=2; _vinted_fr_session=SWFMdmJXTmlFd205UE5BVk13MmoxVENySTBxTW42ZzlYek5XcHU3S2pUVkhURlRkNzI2b0E1R294c0dqU2FBUmJVZHlTcW1OVDRrOXhmWVRlNk01RGhwUWNQdFZsK3RRQ2x2ZlVXenl2WXo1SU1XbTVPaWVqM29rMWlma0Q4WE1pZnJzaXFTQjBNZ0VrNmlpaytIT01NMEZ4cmt3bWNvZDRQZk9ISmRNWFZsNklMcWFhRk00NUN4U0V6bVM2MWFKbjlXMTk0Wkd6VFpWMjZtTUswQzZuWmdvT1VvWTl3ZGtpbno0aDgrZitZZ09helJjTmd5bGZPdTVpbnRwd0ZjTS0tcDVib2hqQU9sVHVWRTZWc2NLaktEZz09--544d22a10ef2b5d5564c30f6434d9319c03af8b3; _ga_8H12QY46R8=GS2.1.s1774282673$o4$g1$t1774283260$j48$l0$h0; _ga_ZJHK1N3D75=GS2.1.s1774282673$o4$g1$t1774283260$j48$l0$h0; cto_bundle=AyyiEl9DJTJCY0kxN3A1JTJCOXpsUHQwbVUyU21GamdESVIlMkJEbjRvWVZCR1JsSUdUVXZ5UjY5cjI1YjM5bkhGWTVrT0FmeDhaQlhHbkJ6WVlPQ21FRERISldqS3pLSHZZd1dGOHgzT2JRMVA0SGtGcGw5Zno1MFVQUWJ2aUNhV1MyNEVSa3o4ZUR3WWx1Z2RWd3hEVDM0NzRYdXFiS3clM0QlM0Q; cto_bidid=Zl_mXF9sRTBHUkhLMEl3WmRMU0xxR01BNEFoUTJQTU1vamIwc2RwZ0h0d0clMkJFaFJrZm9KblRvbzRSeDQwR3pPdGRnWTdBVmhFeFNSQmlnaWhleERQNVJaZXMyJTJCdXRZRXNLcHU0U09ySnJXTW5VSjQlM0Q; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Mar+23+2026+17%3A27%3A41+GMT%2B0100+(heure+normale+d%E2%80%99Europe+centrale)&version=202512.1.0&browserGpcFlag=0&isIABGlobal=false&consentId=196338590&isAnonUser=1&hosts=&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1%2CV2STACK42%3A1%2CC0035%3A1%2CC0038%3A1&genVendors=V2%3A1%2CV1%3A1%2C&intType=1&crTime=1774249939313&geolocation=FR%3BIDF&AwaitingReconsent=false; datadome=F4yV_SlQDuNtvSOjRBxlp7tYtdoCZ~AmLe3K2lwsraUITMhikokUUfeSq3MTljkbECRBjHH5vAYp37sUm4VAHkHmTfde5dtUvLmFy2JC9V5gg5xYCdieNrUNZVLrPqdj";
const COOKIE = process.env.VINTED_COOKIE || DEFAULT_COOKIE;

function isNotDefined(value) {
  return (value == null || (typeof value === "string" && value.trim().length === 0));
}

/**
 * Parse  
 * @param  {String} data - json response
 * @return {Object} sales
 */
const parse = data => {
  try {
    const {items} = data;

    return items.map(item => {
      const link = item.url;
      const price = item.total_item_price;
      const {photo} = item;
      const published = photo.high_resolution && photo.high_resolution.timestamp;

      return {
        link,
        price,
        title: item.title,
        published,
        'uuid': uuidv5(link, uuidv5.URL)
      }
    })
  } catch (error){
    console.error(error);
    return [];
  }
}



const scrape = async searchText => {
  try {

    if (isNotDefined(COOKIE)) {
      throw "vinted requires a valid cookie";
    }

    const response = await fetch(`https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&time=1727382549&search_text=${searchText}&catalog_ids=&size_ids=&brand_ids=89162&status_ids=6,1&material_ids`, {
      "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=0, i",
        "sec-ch-ua": "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "cookie": COOKIE
      },
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET"
    });

    if (response.ok) {
      const body = await response.json();

      return parse(body);
    }

    if (response.status === 401 || response.status === 403) {
      console.error('vinted live request unauthorized. Set a fresh VINTED_COOKIE environment variable.');
      return [];
    }

    console.error(response);

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};


export {scrape};