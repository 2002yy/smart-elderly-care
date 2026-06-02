package com.hecs.mini_program_backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "wechat")
public class WeChatConfig {
    private String appid;
    private String appsecret;
    
    public String getAppid() {
        return appid;
    }
    
    public void setAppid(String appid) {
        this.appid = appid;
    }
    
    public String getAppsecret() {
        return appsecret;
    }
    
    public void setAppsecret(String appsecret) {
        this.appsecret = appsecret;
    }
}
