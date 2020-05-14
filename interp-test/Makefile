family.png: family.dot
	cat family.dot | dot -Tpng > family.png

family.dot: family-rules.dl family-facts.dl
	cat family-facts.dl | ./family-rules.dl > family.dot
