package com.gitcat.letsgitit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class LetsgititApplication {

	public static void main(String[] args) {
		SpringApplication.run(LetsgititApplication.class, args);
	}

}
