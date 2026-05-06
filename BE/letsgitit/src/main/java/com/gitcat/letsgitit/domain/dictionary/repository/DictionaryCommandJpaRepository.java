package com.gitcat.letsgitit.domain.dictionary.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;

public interface DictionaryCommandJpaRepository extends JpaRepository<DictionaryCommand, UUID> {

	@Query("""
			select distinct c
			from DictionaryCommand c
			left join fetch c.options
			order by c.name asc
		""")
	List<DictionaryCommand> findAllWithOptions();
}
